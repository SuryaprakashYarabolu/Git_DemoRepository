sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History"
], function (Controller, History) {
    "use strict";

    return Controller.extend("com.eaton.dev.grcreate.controller.BaseController", {
        /**
         * Convenience method for accessing the router in every controller of the application.
         * @public
         * @returns {sap.ui.core.routing.Router} the router for this component
         */
        getRouter : function () {
            return this.getOwnerComponent().getRouter();
        },

        /**
         * Convenience method for getting the view model by name in every controller of the application.
         * @public
         * @param {string} sName the model name
         * @returns {sap.ui.model.Model} the model instance
         */
        getModel : function (sName) {
            return this.getView().getModel(sName);
        },

        /**
         * Convenience method for setting the view model in every controller of the application.
         * @public
         * @param {sap.ui.model.Model} oModel the model instance
         * @param {string} sName the model name
         * @returns {sap.ui.mvc.View} the view instance
         */
        setModel : function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        setCompModel : function (oModel, sName) {
            return this.getOwnerComponent().setModel(oModel, sName);
        },
        
        getCompModel : function (sName) {
            return this.getOwnerComponent().getModel(sName);
        },
        

        resetVarModel: function(){
            this.getCompModel('glVarModel').setProperty('/serialFrom','');
            this.getCompModel('glVarModel').setProperty('/serialTo','');
            this.getCompModel('glVarModel').setProperty('/filledCounter',0);
            this.getCompModel('serialModel').setProperty('/Serials',[]);
        },
        /**
         * Convenience method for getting the resource bundle.
         * @public
         * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
         */
        getResourceBundle : function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        // To calculate To field in the range input in Serial screen
        onSerialNoChange: function(oEvent){
            let serialTo = Number(this.getCompModel("glVarModel").getProperty('/serialFrom')) + 
                            Number(this.getCompModel('glModel').getProperty('/ReceivedQty')) - 1;
            this.getCompModel("glVarModel").setProperty('/serialTo',serialTo+'');
        },  

        // To update counter in the serial dialog screen
        onValueChange:function(oEvent){
            var serialData = this.getCompModel('serialModel').getData().Serials;
            let filledCounter = 0;
            if(serialData)
            serialData.forEach( function(data) {
                filledCounter = data.Serialno ? filledCounter+1:filledCounter;
            });
            this.getCompModel('glVarModel').setProperty('/filledCounter',filledCounter);
        },

        // To create serial input fields dynamically based on the received qty entered
        onQtyChange: function(oEvent){
            var glVarModel = this.getCompModel('glVarModel');
            glVarModel.setProperty('/serialFrom','');
            glVarModel.setProperty('/serialTo','');
            glVarModel.setProperty('/filledCounter',0);
            this.getModel('btchView').setProperty('/btchQty', this.getCompModel('glModel').getProperty('/ReceivedQty'));
            var oSerialArray = [];
            for(var i=0;i<this.getCompModel('glModel').getProperty('/ReceivedQty');i++){
                oSerialArray.push({
                    Serialno:'',
                    Material:this.getCompModel('glModel').getProperty('/Material'),
                    Batch:'Batch$1'
                });
            }
            this.getCompModel('serialModel').setProperty('/Serials',oSerialArray);
        },

        onMsgBack: function(oEvent){
            this.byId('idMsgBack').navigateBack();
            oEvent.getSource().setVisible(false);
        },

        onItemSelect:function(oEvent){
            this.byId('btnBack').setVisible(true);
        },

        validateInput:function(oEvent){
            var oInput = oEvent.getSource();
            var val = oInput.getValue();
            val = val.replace(/[^\d]/g, '');
            this.getCompModel("glVarModel").setProperty('/serialFrom',val);
            oInput.setValue(val);
            if(val){
                let serialTo = Number(this.getCompModel("glVarModel").getProperty('/serialFrom')) + 
                                Number(this.getCompModel('glModel').getProperty('/ReceivedQty')) - 1;
                this.getCompModel("glVarModel").setProperty('/serialTo',serialTo+'');
            }else{
                this.getCompModel("glVarModel").setProperty('/serialTo','');
            }
        },

        // To generate serial numbers based on range provided
        onSerialGenerate: function(oEvent){
            var oSerials = this.getCompModel('serialModel').getData().Serials;
            var oFrom = this.getCompModel("glVarModel").getProperty('/serialFrom');
            
            for(var i =0;i<oSerials.length;i++){
                oSerials[i].Serialno = oFrom+'';
                oSerials[i] = JSON.parse(JSON.stringify(oSerials[i]));
                oFrom++;
            }
            this.getModel('serialModel').refresh();
            this.onValueChange();
        },
        
        /**
         * Event handler for navigating back.
         * It there is a history entry we go one step back in the browser history
         * If not, it will replace the current entry of the browser history with the list route.
         * @public
         */
        onNavBack : function() {
            var sPreviousHash = History.getInstance().getPreviousHash();

            if (sPreviousHash !== undefined) {
                // eslint-disable-next-line fiori-custom/sap-no-history-manipulation
                history.go(-1);
            } else {
                this.getRouter().navTo("Home", {}, true);
            }
        }

    });

});