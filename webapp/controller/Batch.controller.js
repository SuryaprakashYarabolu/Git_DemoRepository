sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/base/strings/formatMessage"
],
    function (BaseController,
        JSONModel,
        BusyIndicator,
        MessageToast,
        Fragment,
        formatter,
        Filter,
        FilterOperator,
        formatMessage
    ) {
        "use strict";

        return BaseController.extend("com.eaton.dev.grcreate.controller.Batch", {
            formatter: formatter,
            onInit: function () {

                var oViewModel = new JSONModel({
                    busy: false,
                    delay: 0,
                    btch: 'Batch$1',
                    curDate: '',
                    mfrDate: null,
                    split: '',
                    counter: 1,
                    btchIndex: '',
                    btchQty: 0,
                    strBin: ''

                });
                const batches = [];
                var oBindModel = new JSONModel({ 'batches': batches });
                const messages = [];
                var oMsgModel = new JSONModel({ 'Messages': messages });
                this.getRouter().getRoute("Batch").attachPatternMatched(this._onObjectMatched, this);
                this.getView().setModel(oViewModel, "btchView");
                this.getView().setModel(oBindModel, "dataModel");
                this.getView().setModel(oMsgModel, "message");
            },
            onMfrDateChange: function (oEvent) {
                var oType = this.getCompModel('glModel').getProperty('/batchFldInd');
                var sMfrDate = oEvent.getSource().getDateValue();
                if ((oType === 'M' || oType === 'C') && sMfrDate !== null) {

                    var strTotalShelfLife = this.getModel("btchView").getProperty("/totalShelfLife");
                    var expDate = new Date(sMfrDate);
                    expDate.setDate(expDate.getDate() + parseInt(strTotalShelfLife));

                    var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                        pattern: "yyyy-MM-dd"
                    });

                    this.getView().byId("expDate").setValue(oDateFormat.format(expDate));
                }
            },
            onExpDateChange: function (oEvent) {
                var oType = this.getCompModel('glModel').getProperty('/batchFldInd');
                var sExpDate = oEvent.getSource().getDateValue();
                if ((oType === 'M' || oType === 'C') && sExpDate !== null) {

                    var strTotalShelfLife = this.getModel("btchView").getProperty("/totalShelfLife");
                    var mfrDate = new Date(sExpDate);
                    mfrDate.setDate(mfrDate.getDate() - parseInt(strTotalShelfLife));

                    var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                        pattern: "yyyy-MM-dd"
                    });

                    this.getView().byId("mfrDate").setValue(oDateFormat.format(mfrDate));
                }
            },
            // Calling service based on the routing paramters to load the data
            _onObjectMatched: function (oEvent) {
                this.sKey = oEvent.getParameter("arguments").po;
                this.byId('idSplitCheck').setSelected(false);
                var oFilter = [];
                this.curErr = 0;
                if (this.sKey) {
                    var filter1 = new sap.ui.model.Filter({
                        path: "PurchaseOrder",
                        operator: sap.ui.model.FilterOperator.EQ,
                        value1: this.sKey
                    });
                    oFilter.push(filter1);
                }
                if (oEvent.getParameter("arguments").item) {
                    var filter2 = new sap.ui.model.Filter({
                        path: "PurchaseOrderItem",
                        operator: sap.ui.model.FilterOperator.EQ,
                        value1: oEvent.getParameter("arguments").item
                    });
                    oFilter.push(filter2);
                }
                var oBundle = this.getResourceBundle();
                BusyIndicator.show();
                this.getModel().read("/OpenPoItems", {
                    filters: oFilter,
                    success: function (oData) {
                        oData.results[0].ReceivedQty = this.getCompModel('glVarModel').getProperty('/ovwQty');
                        this.getCompModel("glModel").setData(oData.results[0]);
                        this.onQtyChange();
                        var strBin = oData.results[0].StorageBin;
                        var sPurchaseOrder = oData.results[0].PurchaseOrder;                       
                        var sPurchaseOrderItem = oData.results[0].PurchaseOrderItem;
                         var sMaterial = oData.results[0].Material;
                          var sMatDesc = oData.results[0].ItemText;
                        this.getModel("btchView").setProperty('/strBin', strBin);
                        var strTotalShelfLife = oData.results[0].TotalShelfLife;
                        this.getModel("btchView").setProperty('/totalShelfLife', strTotalShelfLife);
                        this.getModel("btchView").setProperty('/po', sPurchaseOrder);
                        this.getModel("btchView").setProperty('/poLine', sPurchaseOrderItem);
                        this.getModel("btchView").setProperty('/mat', sMaterial);
                        this.getModel("btchView").setProperty('/matDesc', sMatDesc);
                        BusyIndicator.hide();
                    }.bind(this),
                    error: function (err) {
                        MessageToast.show(oBundle.getText('serviceErr'));
                        BusyIndicator.hide();
                    }.bind(this)
                });

                this.onClearFields();
            },

            // to update batch qty if the recieved qty is changed
            onQtyChange: function (oEvent) {
                this.getModel('btchView').setProperty('/btchQty', this.getCompModel('glModel').getProperty('/ReceivedQty'));
                this.getModel('btchView').refresh();
            },

            //F4 help for Cure date
            onQtrValueHelp: function (oEvent) {
                var oView = this.getView();
                this.qtrValue = oEvent.getSource().getId();
                if (!this._pValueHelpDialog) {
                    this._pValueHelpDialog = Fragment.load({
                        id: oView.getId(),
                        name: "com.eaton.dev.grcreate.view.QtrValueHelp",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }
                this._pValueHelpDialog.then(function (oDialog) {
                    oDialog.getBinding("items").filter([new Filter("CharcValue", FilterOperator.Contains, '')]);
                    oDialog.open();
                }.bind(this));
            },

            onSearch: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                var oFilter = new Filter("CharcValue", FilterOperator.Contains, sValue);
                oEvent.getSource().getBinding("items").filter([oFilter]);
            },

            onQtrChange: function (oEvent) {
                this.sValue = oEvent.getParameter("value");
                var oFilter = [], oPath, oBundle = this.getResourceBundle();
                oFilter.push(new Filter("CharcValue", FilterOperator.EQ, this.sValue.toUpperCase()));
                this.getModel().read("/CureDate", {
                    filters: oFilter,
                    success: function (oData) {
                        this.curErr = 0;
                        if (!oData.results.length) {
                            MessageToast.show(formatMessage(oBundle.getText('qtrErr'), [this.sValue]));
                            this.curErr = 1;
                        }
                        BusyIndicator.hide();
                    }.bind(this),
                    error: function (err) {
                        MessageToast.show(oBundle.getText('serviceErr'));
                        BusyIndicator.hide();
                    }.bind(this)
                });
            },

            // to display batch table based on split check box selection
            handleBatchSplit: function (oEvent) {
                var oSplit = oEvent.getSource().getSelected();
                if (oSplit) {
                    this.getModel('btchView').setProperty('/split', 'X');
                    this.getModel('dataModel').setProperty('/batches', []);
                    this.handleAddSplitRow();
                } else {
                    this.getModel('btchView').setProperty('/split', '');
                    this.onQtyChange();
                }
            },

            // to validate the quantity that has been input against received qty
            handleQuantityCheck: function (oEvent) {
                var oModel = this.getModel('dataModel');
                var oBundle = this.getResourceBundle();
                let sum = 0, oPath, oIndex = this.byId('idBatchTable').indexOfItem(oEvent.getSource().getParent().getParent());
                if (this.getCompModel('glModel').getProperty('/flag') !== 'P') {
                    if (oModel.getData().batches[oIndex].BatchQty !== oModel.getData().batches[oIndex].serials.length) {
                        oModel.getData().batches[oIndex].serials = [];
                        this.onValueChange();
                    }
                }
                oModel.getData().batches.forEach(function (arr) {
                    sum = sum + Number(arr.BatchQty);
                });
                if (sum > Number(this.getCompModel('glModel').getProperty('/ReceivedQty'))) {
                    MessageToast.show(oBundle.getText('sumQtyErr'));
                    oPath = '/batches/' + oIndex + '/BatchQty';
                    oModel.setProperty(oPath, '');
                }
            },

            // to delete batch and serial data on clicking of delete icon  in the batch table
            onBatchDelete: function (oEvent) {
                var oIndex = this.getView().byId('idBatchTable').indexOfItem(oEvent.getParameter('listItem'));
                var oBatches = this.getModel('dataModel').getData().batches;
                oBatches.splice(oIndex, 1);
                this.getModel('dataModel').setData('batches', oBatches);
            },

            // To update models and create line item dynamically on clicking of add item
            handleAddSplitRow: function (oEvent) {
                var jModel = this.getModel('dataModel');
                var oBundle = this.getResourceBundle();
                let sum = 0; let oSplitFlag = '', qtyCheck = 0;
                var recQty = this.getCompModel('glModel').getProperty('/ReceivedQty');
                if (recQty) {
                    jModel.getData().batches.forEach(item => {
                        if (item.BatchQty)
                            sum = sum + Number(item.BatchQty);
                        else
                            qtyCheck = 1;
                    });
                    if (!qtyCheck) {
                        if (Number(sum) < Number(recQty)) {
                            let batchId = "Batch$" + this.getModel('btchView').getProperty('/counter');
                            if (!this.byId('idSplitCheck').getSelected()) {
                                var oBatch = {
                                    Material: this.getCompModel('glModel').getProperty('/Material'),
                                    Batch: batchId,
                                    BatchQty: '',
                                    Curedate: '',
                                    Manufacturedate: null
                                };
                                if (this.getCompModel('glModel').getProperty('/flag') === 'R')
                                    oBatch.serials = [];
                                jModel.getData().batches.push(JSON.parse(JSON.stringify(oBatch)));
                            } else {
                                var oSplitBatch = {
                                    Material: this.getCompModel('glModel').getProperty('/Material'),
                                    Batch: batchId,
                                    Curedate: '',
                                    BatchQty: '',
                                    Manufacturedate: null
                                };
                                if (this.getCompModel('glModel').getProperty('/flag') === 'R')
                                    oSplitBatch.serials = [];
                                jModel.getData().batches.push(JSON.parse(JSON.stringify(oSplitBatch)));
                            }
                            this.getModel('btchView').setProperty('/counter', this.getModel('btchView').getProperty('/counter') + 1);
                            jModel.refresh();
                        } else {
                            MessageToast.show(oBundle.getText('sumSptQtyErr'));
                        }
                    } else {
                        MessageToast.show(oBundle.getText('btchQtyCheck'));
                    }
                } else {
                    MessageToast.show(oBundle.getText("recQtyCheck"));
                }
            },

            // Opens serial dialog screen
            onAddSerial: function (oEvent) {
                var oView = this.getView();
                var oBundle = this.getResourceBundle();
                var recQty = this.getCompModel('glModel').getProperty('/ReceivedQty');
                if (!recQty) {
                    MessageToast.show(oBundle.getText("recQtyCheck"));
                    return
                }
                this.oSource = oEvent.getSource().getParent().getParent();
                BusyIndicator.show();
                if (!this.serialDialog) {
                    this.serialDialog = Fragment.load({
                        id: oView.getId(),
                        name: "com.eaton.dev.grcreate.view.AddSerial",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }
                this.serialDialog.then(function (oDialog) {
                    this.getCompModel('glVarModel').setProperty('/qtyVisible', false);
                    var oIndex, oSerials, batchQty;
                    var jModel = this.getModel('dataModel'),
                        glModel = this.getCompModel('glModel'),
                        glVarModel = this.getCompModel('glVarModel');
                    var batchModel = this.getModel('btchView');
                    if (this.byId('idSplitCheck').getSelected()) {
                        oIndex = this.byId('idBatchTable').indexOfItem(this.oSource);
                        oSerials = jModel.getData().batches[oIndex].serials;
                        batchQty = this.oSource.getBindingContext('dataModel').getProperty('BatchQty');
                        if (!batchQty) {
                            MessageToast.show(oBundle.getText('addSerialErr'));
                            BusyIndicator.hide();
                            return;
                        }
                    } else {
                        if (jModel.getData().batches.length === 0) {
                            var oBatch = {
                                Material: glModel.getProperty('/Material'),
                                Batch: batchModel.getProperty('/btch'),
                                Curedate: this.getModel('btchView').getProperty('/curDate'),
                                BatchQty: glModel.getProperty('/ReceivedQty'),
                                Manufacturedate: this.getModel('btchView').getProperty('/mfrDate'),
                                serials: []
                            };
                            jModel.getData().batches.push(oBatch);
                        }
                        oIndex = 0;
                        batchQty = glModel.getProperty('/ReceivedQty');
                        oSerials = jModel.getData().batches[0].serials;
                        if (Number(batchQty) !== oSerials.length) {
                            oSerials = [];
                            jModel.setProperty('/batches/0/BatchQty', batchQty);
                        }
                    }

                    batchModel.setProperty('/btchQty', batchQty);
                    batchModel.setProperty('/btchIndex', oIndex);
                    glVarModel.setProperty('/serialFrom', '');
                    glVarModel.setProperty('/serialTo', '');
                    glVarModel.setProperty('/filledCounter', 0);
                    this.onValueChange();

                    var oSerialArray = [];
                    if (!oSerials.length) {
                        var oBatchId;
                        for (var i = 0; i < batchQty; i++) {
                            if (this.byId('idSplitCheck').getSelected()) {
                                oBatchId = jModel.getData().batches[oIndex].Batch;
                            } else {

                                oBatchId = batchModel.getProperty('/btch');
                            }
                            oSerialArray.push({
                                Serialno: '',
                                Batch: oBatchId
                            });
                        }
                        this.getCompModel('serialModel').setProperty('/Serials', oSerialArray);
                    } else {
                        this.getCompModel('serialModel').setProperty('/Serials', oSerials);
                    }
                    this.onValueChange();
                    BusyIndicator.hide();
                    oDialog.open();
                }.bind(this));
            },



            //F4 help dialog close on selection of item
            onValueHelpDialogClose: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedItem");
                if (!oSelectedItem) {
                    return;
                }
                if (this.byId('idSplitCheck').getSelected())
                    sap.ui.getCore().byId(this.qtrValue).setValue(oSelectedItem.getTitle());
                else
                    this.getModel('btchView').setProperty('/curDate', oSelectedItem.getTitle());

            },

            // To update batch and serial json models on click of update button in the serial dialog screen
            onHandleSplitUpdate: function (oEvent) {
                var btchView = this.getModel('btchView');
                var oBundle = this.getResourceBundle();
                if (Number(btchView.getProperty('/btchQty')) !== Number(this.getCompModel('glVarModel').getProperty('/filledCounter'))) {
                    MessageToast.show(oBundle.getText('fillSerialErr'));
                    return;
                }

                var oIndex = btchView.getProperty('/btchIndex');
                var oBatches = this.getModel('dataModel').getData().batches;
                oBatches[oIndex].serials = this.getCompModel('serialModel').getData().Serials;
                this.getModel('dataModel').setProperty('/batches', oBatches);
                oEvent.getSource().getParent().close();
            },


            // To reset models
            onClearFields: function (oEvent) {
                var resetObj = {
                    busy: false,
                    delay: 0,
                    btch: 'Batch$1',
                    curDate: '',
                    mfrDate: null,
                    split: '',
                    counter: 1,
                    btchIndex: '',
                    btchQty: 0
                };
                this.getModel("btchView").setData(resetObj);
                this.getModel('dataModel').setProperty('/batches', []);
                this.getCompModel('serialModel').setProperty('/serials', []);
                this.resetVarModel();
            },

            onClose: function (oEvent) {
                oEvent.getSource().getParent().close();
            },

            // To create GR
            onCreateGR: function (oEvent) {
                var btchArr = this.getModel("dataModel").getData().batches;
                var exitFlg = 0;
                var grObj = this.getCompModel('glModel').getData();
                var oBundle = this.getResourceBundle();
                delete grObj.__metadata;
                if (this.curErr) {
                    MessageToast.show(formatMessage(oBundle.getText('qtrErr'), [this.sValue]));
                    return;
                }
                if (Number(grObj.ReceivedQty) > 100) {
                    MessageToast.show(oBundle.getText('Max quantity allowed is 100000')); // "Quantity exceed allowed limit."
                    return;
                }


                if (!(this.byId('idSplitCheck').getSelected())) {
                    // if(!btchArr.length){
                    var oBatch = {
                        Material: this.getCompModel('glModel').getProperty('/Material'),
                        Batch: 'Batch$1',
                        BatchQty: this.getCompModel('glModel').getProperty('/ReceivedQty'),
                        Curedate: this.getModel('btchView').getProperty('/curDate'),
                        Manufacturedate: this.getModel('btchView').getProperty('/mfrDate'),
                        Expirydate: this.getModel('btchView').getProperty('/expDate')

                    };
                    grObj.to_Batch = [oBatch];
                    // }
                    if (!this.getModel('btchView').getProperty('/curDate') && (this.getCompModel('glModel').getProperty('/batchFldInd') === 'C')) {
                        MessageToast.show(oBundle.getText('cureDateCheck'), { duration: 1000 });
                        return;
                    }
                    // if (!this.getModel('btchView').getProperty('/mfrDate') && (this.getCompModel('glModel').getProperty('/batchFldInd') === 'M')) {
                    //     MessageToast.show(oBundle.getText('mfrDateCheck'), { duration: 1000 });
                    //     return;
                    // }
                    var sType = this.getCompModel('glModel').getProperty('/batchFldInd');
                    if ((sType === 'M') && (!this.getModel('btchView').getProperty('/mfrDate') && !this.getModel('btchView').getProperty('/expDate'))) {
                        MessageToast.show(oBundle.getText('mfrexpDateCheck'), { duration: 1000 });
                        return;
                    }

                    if (this.getCompModel('glModel').getProperty('/flag') === 'R') {
                        // if(btchArr.length){
                        // grObj.to_Batch = btchArr.map(({serials, ...rest}) => rest);
                        if (btchArr[0].serials.length) {
                            grObj.to_Serialno = btchArr[0].serials;
                        } else {
                            MessageToast.show(oBundle.getText('serialErr'), { duration: 1000 });
                            return;
                        }
                        // }else{
                        //     MessageToast.show(oBundle.getText('serialErr'),{ duration:1000 });
                        //     return;
                        // }
                    }
                } else {
                    if (btchArr.length) {
                        var serArr = [], sum = 0;
                        btchArr.forEach(function (oBatch) {
                            sum = sum + Number(oBatch.BatchQty);
                            if (!oBatch.Curedate && (this.getCompModel('glModel').getProperty('/batchFldInd') === 'C')) {
                                MessageToast.show(oBundle.getText('cureDateCheck'), { duration: 1000 });
                                exitFlg = 1;
                                return;
                            }
                            if (!oBatch.Manufacturedate && (this.getCompModel('glModel').getProperty('/batchFldInd') === 'M')) {
                                MessageToast.show(oBundle.getText('mfrDateCheck'), { duration: 1000 });
                                exitFlg = 1;
                                return;
                            }
                            if (this.getCompModel('glModel').getProperty('/flag') === 'R') {
                                if (oBatch.serials.length) {
                                    serArr = serArr.concat(oBatch.serials);
                                }
                                else {
                                    MessageToast.show(oBundle.getText('serialErr'), { duration: 1000 });
                                    exitFlg = 1;
                                    return
                                }
                            }
                        }.bind(this));
                        if (Number(grObj.ReceivedQty) !== sum) {
                            MessageToast.show(oBundle.getText('btchRecQtyErr'), { duration: 1000 });
                            return;
                        }
                        grObj.to_Batch = btchArr.map(({ serials, ...rest }) => rest);
                        grObj.to_Serialno = serArr;
                    }
                    else {
                        MessageToast.show(oBundle.getText('btchErr'), { duration: 1000 });
                        return
                    }
                }

                if (exitFlg) {
                    return;
                }
                BusyIndicator.show();
                grObj.PackingList = this.getCompModel('glVarModel').getProperty('/packingSlip');
                grObj.StorageBin = this.getModel('btchView').getData().strBin;
                this.sucObj = '';
                this.getView().getModel().create("/OpenPoItems", grObj,
                    {
                        success: function (oData, response) {
                            var oMsg = JSON.parse(response.headers["sap-message"]);
                            var oMsgObj = {
                                severity: oMsg.severity,
                                message: oMsg.message
                            }
                            oMsg.details.push(JSON.parse(JSON.stringify(oMsgObj)));
                            // oMsgModel.setData({'Messages':oMsg.details});
                            this.sucObj = oMsg.details.find(obj => obj.severity === 'success');
                            var oView = this.getView();
                            this.getModel('message').setProperty('/Messages', oMsg.details);
                            if (!this.msgDialog) {
                                this.msgDialog = Fragment.load({
                                    id: oView.getId(),
                                    name: "com.eaton.dev.grcreate.view.MessageDialog",
                                    controller: this
                                }).then(function (oMsgDialog) {
                                    oView.addDependent(oMsgDialog);
                                    return oMsgDialog;
                                });
                            }
                            this.msgDialog.then(function (oMsgDialog) {

                                oMsgDialog.open();
                            }.bind(this));
                            BusyIndicator.hide();
                        }.bind(this),
                        error: function (oError) {
                            MessageToast.show(oBundle.getText('serviceErr'));
                            BusyIndicator.hide();
                        }
                    });
            },

            // To close the return message that appears on creating GR 
            onMsgClose: function (oEvent) {
                oEvent.getSource().getParent().close();
                this.byId('idMsgBack').navigateBack();
                if (this.sucObj) {
                    // this.onNavBack();
                    this.getRouter().navTo("Home", {}, true);
                    this.onClearFields();
                }

            }


        });
    });
