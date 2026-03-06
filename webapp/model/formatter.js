sap.ui.define([], function () {
    "use strict";
    return {
        serialVisibility: function (oSplit, oType) {
            if (oSplit !== 'X' && oType === 'R')
                return true;
            else
                return false;
        },

        curDateVisibility: function (oSplit, oType) {
            if (oSplit !== 'X' && oType === 'C')
                return true;
            else
                return false;
        },

        mfrDateVisibility: function (oSplit, oType) {
            if (oSplit !== 'X' && (oType === 'M'))
                return true;
            else
                return false;
        },
        expDateVisibility: function (oSplit, oType) {
            if (oSplit !== 'X' && (oType === 'M'))
                return true;
            else
                return false;
        },

        messageType: function (oType) {
            switch (oType) {
                case 'error':
                    return 'Error';
                    break;
                case 'warning':
                    return 'Warning';
                    break;
                case 'success':
                    return 'Success';
                    break;
            }
        }
    };
});