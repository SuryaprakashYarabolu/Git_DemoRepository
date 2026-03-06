/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "com/eaton/dev/grcreate/model/models"
    ],
    function (UIComponent, Device, models) {
        "use strict";

        return UIComponent.extend("com.eaton.dev.grcreate.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");

                var glVarModel = new sap.ui.model.json.JSONModel({
                    packingSlip : '',
                    serialFrom:'',
                    serialTo:'',
                    filledCounter:0,
                    qtyVisible:false,
                    ovwQty:''
                });
               
                this.setModel(glVarModel,'glVarModel');

                var searchModel = new sap.ui.model.json.JSONModel();

                this.setModel(searchModel,'searchModel');

                var glModel = new sap.ui.model.json.JSONModel();

                this.setModel(glModel,'glModel');

                var serialModel = new sap.ui.model.json.JSONModel([]);
               
                this.setModel(serialModel,'serialModel');
            }
        });
    }
);