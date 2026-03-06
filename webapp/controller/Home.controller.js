sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "../model/formatter"
],
function (BaseController,
    JSONModel,
	BusyIndicator,
	MessageToast,
    Fragment,
    MessageBox,
    formatter) {
    "use strict";

    return BaseController.extend("com.eaton.dev.grcreate.controller.Home", {

        // Modification History
        // Request #   : AGUK905565       
        // JIRA ID #   : AERP-43089
        // Developer   : Sunil Siddeswaraiah(C7755008)
        // Date        : 24/06/2025
        // Desscription: Intial Development
        // CD ID       : 9000010521

        formatter: formatter,

        // Initializing models
        onInit: function () {
            var oBindModel= new JSONModel({
                po:'',
                poLine:'',
                mat:'',
                pSlip:'',
                print:'',
                btchQty:0,
                singleItem:false,
                enbld:true,
                enbldPrint:true
            });
            this.getRouter().getRoute("Home").attachPatternMatched(this.onRoutePatternMatched, this);
            this.setModel(oBindModel, "btchView");
            const messages = [];
            var oMsgModel = new JSONModel({'Messages':messages});
            this.getView().setModel(oMsgModel, "message");
            this.getPrinter();
        },
        getPrinter: function(){

            this.getOwnerComponent().getModel().read("/PrintName", {
                // filters:oFilter,
                success: function(oData){
                    if(oData.results.length > 0){
                    var printerName = oData.results[0].PRINTERNAME;
                        this.getModel("btchView").setProperty('/print',printerName);
                    }
                    BusyIndicator.hide();
                }.bind(this),
                error:function(err){
                    // MessageToast.show(oBundle.getText('serviceErr'));
                    BusyIndicator.hide();
                }.bind(this)
            });

        },


        //Resetting the models
        onClearFields: function(oEvent){
           var obtchModel = this.getModel("btchView").getData();
            var clrObj= {
                po:'',
                poLine:'',
                mat:'',
                pSlip:'',
                btchQty:0,
                singleItem:false,
                enbld:true,
                enbldPrint:true,
                print:obtchModel.print
            };
            this.getModel("btchView").setData(clrObj);
            this.resetVarModel();
            // this.getCompModel('serialModel').setProperty('/serials',[]);
            this.getCompModel('searchModel').setData({});
        },

        onRoutePatternMatched: function (oEvent) {
            this.onClearFields();
        },


        // To fetch the data based on the data provided in the screen

        onGetData: function(oEvent){
            var oBundle = this.getResourceBundle();
            var searchObj = this.getView().getModel('btchView').getData();
            this.getCompModel('searchModel').setData(searchObj);
            var oFilter = [];
            if(searchObj.po === '' || searchObj.pSlip === ''){
                MessageToast.show(oBundle.getText('mandtErr'));
                return;
            }
            var filter1= new sap.ui.model.Filter({
                path: "PurchaseOrder",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: searchObj.po
            });
            oFilter.push(filter1);
            if(searchObj.poLine){
                var filter2= new sap.ui.model.Filter({
                    path: "PurchaseOrderItem",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: searchObj.poLine ? searchObj.poLine : ''
                });
                oFilter.push(filter2);
            }
            if(searchObj.mat){
                var filter3= new sap.ui.model.Filter({
                    path: "Material",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: searchObj.mat ? searchObj.mat : ''
                });
                oFilter.push(filter3);
            }
            this.getCompModel('glVarModel').setProperty('/ovwQty','');
            const oRouter = this.getRouter();
            BusyIndicator.show();
            this.getModel().read("/OpenPoItems", {
                filters:oFilter,
                success: function(oData){
                    BusyIndicator.hide();
                    this.resetVarModel();
                    this.getCompModel('glVarModel').setProperty('/packingSlip',searchObj.pSlip);
                    if(oData.results.length > 0){
                        // if more items are returned from service call, navigate to PO overview(Items) screen
                        if(oData.results.length > 1){
                            this.getCompModel("glModel").setData({});
                            
                            oRouter.navTo("Items",{
                                po : searchObj.po
                            });
                        }else{

                            if(oData.results[0].SupplierConfirmationControlKey){
                                MessageBox.error(oBundle.getText('controlKeyErr'));
                                this.onClearFields();
                                return;
                            }
                        // if only one item is returned from service call, check the flag
                        // if flag is 'S' or empty navigate to PO overview screen,
                        // if flag is 'Q, open serial dialog screen
                        // if flag is neither of the above, open Batch screen
                            var oFlag = oData.results[0].flag;
                            this.getCompModel("glModel").setData(oData.results[0]);
                            this.getModel('btchView').setProperty('/singleItem',false);
                            this.getModel('btchView').setProperty('/enbld',true);
                            if(oFlag === 'S' || oFlag === ''){
                                // oRouter.navTo("Items",{
                                //     po : searchObj.po
                                // });
                                this.getModel('btchView').setProperty('/singleItem',true);
                                this.getModel('btchView').setProperty('/enbld',false);
                                this.getModel('btchView').setProperty('/enbldPrint',true);
                                this.getModel('btchView').setProperty('/poLine',oData.results[0].PurchaseOrderItem);
                                this.getModel('btchView').setProperty('/mat',oData.results[0].Material);
                                  this.getModel('btchView').setProperty('/matDesc',oData.results[0].ItemText);
                            }else if(oFlag === 'Q'){
                                var oView = this.getView();
                                
                                if (!this.serialDialog) {
                                    this.serialDialog = Fragment.load({
                                        id: oView.getId(),
                                        name: "com.eaton.dev.grcreate.view.AddSerial",
                                        controller: this
                                    }).then(function (oDialog){
                                        oView.addDependent(oDialog);
                                        return oDialog;
                                    });
                                }
                                this.serialDialog.then(function(oDialog){
                                    this.getCompModel('glVarModel').setProperty('/qtyVisible', true);
                                    this.getModel('btchView').setProperty('/btchQty',0);
                                    oDialog.open();
                                }.bind(this));
                            }
                            else{
                                oRouter.navTo("Batch",{
                                    po : searchObj.po,
                                    item:oData.results[0].PurchaseOrderItem
                                });
                            }
                        }
                    }else{
                        MessageToast.show(oBundle.getText('noData'));  
                    }
                }.bind(this),
                error:function(err){
                    MessageToast.show(oBundle.getText('serviceErr'));
                    BusyIndicator.hide();
                }.bind(this)
            });
        },


        onClose: function(oEvent){
            oEvent.getSource().getParent().close();
        },
        
        // To create GR 
        onCreateGR: function(oEvent){ 
            var poObj = this.getCompModel('glModel').getData();
            var oBundle = this.getResourceBundle();
            poObj.PackingList = this.getCompModel('glVarModel').getProperty('/packingSlip');
            var btchView = this.getModel('btchView');
            if(btchView.getProperty('/singleItem') && !poObj.ReceivedQty){
                MessageToast.show(oBundle.getText('recQtyCheck'));
                return;
            }
            if(Number(btchView.getProperty('/btchQty')) !== Number(this.getCompModel('glVarModel').getProperty('/filledCounter'))){
                MessageToast.show(oBundle.getText('fillSerialErr'));
                return;
            }
           
            poObj.to_Serialno = this.getCompModel('serialModel').getData().Serials;
            
            if(!poObj.to_Serialno.length && !btchView.getProperty('/singleItem')){
                MessageToast.show(oBundle.getText('serialErr'));
                return;
            }
            
            delete poObj.__metadata;
            poObj.to_Batch = [];
            BusyIndicator.show();
            this.getView().getModel().create("/OpenPoItems", poObj, 
            {
                success: function(oData,response){
                    var oMsg = response.headers["sap-message"];
                    var oMsg =JSON.parse(response.headers["sap-message"]);

                    var oMsgObj = {
                        severity:oMsg.severity,
                        message:oMsg.message
                    }
                    oMsg.details.push(JSON.parse(JSON.stringify(oMsgObj)));
                    this.sucObj = oMsg.details.find(obj => obj.severity === 'success');
                    var oView = this.getView();
                    this.getModel('message').setProperty('/Messages',oMsg.details);
                    if (!this.msgDialog) {
                        this.msgDialog = Fragment.load({
                            id: oView.getId(),
                            name: "com.eaton.dev.grcreate.view.MessageDialog",
                            controller: this
                        }).then(function (oMsgDialog){
                            oView.addDependent(oMsgDialog);
                            return oMsgDialog;
                        });
                    }
                    this.msgDialog.then(function(oMsgDialog){
                        
                        oMsgDialog.open();
			        }.bind(this));

                    BusyIndicator.hide();
                }.bind(this),
                error: function(oError){
                    MessageToast.show(oBundle.getText('serviceErr'));
                    BusyIndicator.hide();
                }
            });
        },

        // To close the return message that appears on creating GR 
        onMsgClose: function(oEvent){
            oEvent.getSource().getParent().close();
            this.byId('idMsgBack').navigateBack();
            if(this.sucObj){
                this.getCompModel('serialModel').setProperty('/Serials',[]);
                this.getModel('btchView').setProperty('/btchQty',0);
                this.resetVarModel();
                this.onClearFields();
            }
        },

        onDialogClose: function(oEvent){
            oEvent.getSource().getParent().close();
        }
    });
});
