sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "../model/formatter"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (BaseController,
	JSONModel,
	BusyIndicator,
	MessageToast,
    MessageBox,
    Fragment,
    formatter) {
        "use strict";

        return BaseController.extend("com.eaton.dev.grcreate.controller.Items", {
            formatter: formatter,
            //Intializing models
            onInit: function () {

                var oViewModel = new JSONModel({
                    updFlag : false,
                    grFlag : false,
                    po:'',
                    counter:1,
                    btchQty:0,
                });
                this.setModel(oViewModel, "btchView");
                this.getRouter().getRoute("Items").attachPatternMatched(this._onObjectMatched, this);
                var oHelperModel = new JSONModel({
                    oTop:500,
                    oSkip:0,
                    oCount:0
                });
                this.getView().setModel(oHelperModel, "helperView");
                const messages = [];
                var oMsgModel = new JSONModel({'Messages':messages});
                this.getView().setModel(oMsgModel, "message");
            },

            onClose: function(oEvent){
                oEvent.getSource().getParent().close();
            },

            // Calling service based on the routing paramters to load the data
            _onObjectMatched: function (oEvent) {
                this.sKey =  oEvent.getParameter("arguments").po;
                this.getModel('btchView').setProperty('/po',this.sKey);
                var oBundle = this.getResourceBundle();
                var glData = this.getCompModel('searchModel') ? this.getCompModel('searchModel').getData() : '';
                var oFilter = [];
                var filter1= new sap.ui.model.Filter({
                    path: "PurchaseOrder",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: this.sKey
                });
                oFilter.push(filter1);
                if(glData){
                    if(glData.poLine){
                        var filter2= new sap.ui.model.Filter({
                            path: "PurchaseOrderItem",
                            operator: sap.ui.model.FilterOperator.EQ,
                            value1: glData.poLine
                        });
                        oFilter.push(filter2);
                    }
                    if(glData.mat){
                        var filter3= new sap.ui.model.Filter({
                            path: "Material",
                            operator: sap.ui.model.FilterOperator.EQ,
                            value1: glData.mat
                        });
                        oFilter.push(filter3);
                    }
                }
                // BusyIndicator.show();
                var poTable = this.byId('idPOTable');
                poTable.getBinding("items").refresh(true);
                poTable.getBinding("items").filter(oFilter);
                
                if(poTable.getSelectedItem()){
                    this.getModel().setProperty(poTable.getSelectedItem().getBindingContext().getPath() + '/ReceivedQty','');
                    poTable.removeSelections();
                }
                poTable.scrollToIndex(0);
                

            },

            // To handle the visiblity of buttons based on the PO item selected
            onItemSelection : function(oEvent){
                var oTable = this.getView().byId('idPOTable');
                var poObj = oTable.getSelectedItem().getBindingContext().getObject();
                var obtchView = this.getModel('btchView');
                if(poObj.flag === 'S' || poObj.flag === ''){
                    obtchView.setProperty('/grFlag',true);
                    obtchView.setProperty('/updFlag',false);   
                }else{
                    obtchView.setProperty('/grFlag',false);
                    obtchView.setProperty('/updFlag',true);
                }

               
            },


            // To open the Serial dialog screen on click of Update button
            onUpdate: function(oEvent){
                var oBundle = this.getResourceBundle();
                var oTable = this.getView().byId('idPOTable');
                this.onClearFields();
                // var poObj = this.getModel().getData().poItems[oTable.indexOfItem(oTable.getSelectedItem())];
                var poObj = oTable.getSelectedItem().getBindingContext().getObject();
                if(poObj.SupplierConfirmationControlKey){
                    MessageBox.error(oBundle.getText('controlKeyErr'),{
                        actions: [ MessageBox.Action.CLOSE],
                        onClose: function (sAction) {
                            this.onNavBack();
                        }.bind(this),
                        dependentOn: this.getView()
                    }); 
                    return;
                }
                this.getCompModel('glModel').setData(poObj);
                
                if(!poObj.ReceivedQty){
                    MessageToast.show(oBundle.getText('qtyInpErr'));
                    return;
                }
                if(poObj.flag !== 'Q'){
                    this.getCompModel('glVarModel').setProperty('/ovwQty',poObj.ReceivedQty);
                    const oRouter = this.getRouter();
                    oRouter.navTo("Batch",{
                        po : this.sKey,
                        item:poObj.PurchaseOrderItem
                    });
                }else{
                    var oView = this.getView();
                    // this.oSource = oEvent.getSource().getParent();
                    BusyIndicator.show();
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
                        var oIndex, oSerials;
                        var batchModel = this.getModel('btchView');
                        batchModel.setProperty('/btchQty',poObj.ReceivedQty);
                        
                        var glVarModel = this.getCompModel('glVarModel');
                        glVarModel.setProperty('/qtyVisible', true);
                        glVarModel.setProperty('/serialFrom','');
                        glVarModel.setProperty('/serialTo','');
                        glVarModel.setProperty('/filledCounter',0);
                        var oSerialArray = [];
                       
                            for(var i=0;i<poObj.ReceivedQty;i++){
                                oSerialArray.push({
                                    Serialno:'',
                                    Material:this.getCompModel('glModel').getProperty('/Material'),
                                    Batch:'Batch$1'
                                });
                            }
                            this.getCompModel('serialModel').setProperty('/Serials',oSerialArray);
                        BusyIndicator.hide();
                        oDialog.open();
                    }.bind(this));
                }
            },

           


            // To create GR 
            onCreateGR: function(oEvent){
                // var selObj = this.getView().byId('idPOTable').getSelectedItem();
                var oTable = this.getView().byId('idPOTable');
                var oBundle = this.getResourceBundle();
                var btchView = this.getModel('btchView');
                if(!this.getModel('btchView').getProperty('/grFlag')){
                    this.oDialog = oEvent.getSource().getParent(); 
                    if(Number(btchView.getProperty('/btchQty')) !== Number(this.getCompModel('glVarModel').getProperty('/filledCounter'))){
                        MessageToast.show(oBundle.getText('fillSerialErr'));
                        return;
                    } 
                }
                
                var poObj = oTable.getSelectedItem().getBindingContext().getObject();
                poObj.PackingList = this.getCompModel('glVarModel').getProperty('/packingSlip');
                if(poObj.SupplierConfirmationControlKey){
                    MessageBox.error(oBundle.getText('controlKeyErr'),{
                        actions: [ MessageBox.Action.CLOSE],
                        onClose: function (sAction) {
                            this.onNavBack();
                        }.bind(this),
                        dependentOn: this.getView()
                    }); 
                    return;
                }
                BusyIndicator.show();
                poObj.to_Serialno = [];
                if(poObj.flag === 'Q'){
                    poObj.to_Serialno = this.getCompModel('serialModel').getData().Serials;
                }
                delete poObj.__metadata;
                poObj.to_Batch = [];
                this.getView().getModel().create("/OpenPoItems", poObj, 
                {
                    success: function(oData,response){                        
                        // var oMsg = response.headers["sap-message"];
                        var oMsg =JSON.parse(response.headers["sap-message"]);

                        var oMsgObj = {
                            severity:oMsg.severity,
                            message:oMsg.message
                        }
                        oMsg.details.push(JSON.parse(JSON.stringify(oMsgObj)));
                        // var oMsgModel = new JSONModel({'Messages':oMsg.details});
                        this.sucObj = oMsg.details.find(obj => obj.severity === 'success');
                        var oView = this.getView();
                        // this.setModel(oMsgModel,'message');
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

            // To reset models
            onClearFields: function(){ 
                this.getModel("btchView").setProperty('/counter',1);  
                this.getModel("btchView").setProperty('/btchQty',0);   
                this.resetVarModel();
            },

            // To close the return message displayed after creating GR
            onMsgClose: function(oEvent){
                oEvent.getSource().getParent().close();
                this.byId('idMsgBack').navigateBack();
                var obtchView = this.getModel('btchView');
                if(this.sucObj){
                    obtchView.setProperty('/grFlag',false);
                    obtchView.setProperty('/updFlag',false);
                    
                    if(this.oDialog){
                        this.oDialog.close();
                    }
                    this.onClearFields();
                    this.onItemSelection();
                    this.getModel().setProperty(this.byId('idPOTable').getSelectedItem().getBindingContext().getPath() + '/ReceivedQty','');
                    this.onNavBack();
                }
            },
            
            // To auto select line item once the user inputs quantity
            onInpQtyChange:function(oEvent){
                var oSource = oEvent.getSource().getParent().getParent();
                this.getModel().setProperty(oSource.getBindingContext().getPath() + '/ReceivedQty',oEvent.getParameter('newValue'));
                this.byId('idPOTable').setSelectedItem(oSource);
                this.onItemSelection();
            }
        });
    });
