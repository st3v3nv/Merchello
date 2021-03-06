﻿(function (merchelloServices, undefined) {


    /**
        * @ngdoc service
        * @name merchello.Services.ReportPluginExportOrders
        * @description Loads in data and allows modification for orders
        **/
    merchelloServices.ReportPluginSalesByItem = function ($http, umbRequestHelper) {

        return {

            getDefaultData: function () {

                return umbRequestHelper.resourcePromise(
                    $http({
                        url: umbRequestHelper.getApiUrl('merchelloReportSalesByItem', 'GetDefaultReportData'),
                        method: "GET"
                    }),
                    'Failed to get default data from the service');
            },

            /**
            * @ngdoc method
            * @name searchInvoicesByDateRange
            * @description 
            **/
            searchByDateRange: function (query) {
                var listQuery;
                if (query === undefined) {
                    query = new merchello.Models.ListQuery({
                        currentPage: 0,
                        itemsPerPage: 100,
                        sortBy: '',
                        sortDirection: ''
                    });
                    listQuery = new merchello.Models.ListQuery(query);
                } else {
                    listQuery = query;
                }

                return umbRequestHelper.resourcePromise(
                        $http.post(umbRequestHelper.getApiUrl('merchelloReportSalesByItem', 'SearchByDateRange'), listQuery),
                        'Failed to retreive report data from the service');
            }
            //,

            //exportSearchByDateRange: function (query) {
            //    var listQuery;
            //    if (query === undefined) {
            //        query = new merchello.Models.ListQuery({
            //            currentPage: 0,
            //            itemsPerPage: 100,
            //            sortBy: '',
            //            sortDirection: ''
            //        });
            //        listQuery = new merchello.Models.ListQuery(query);
            //    } else {
            //        listQuery = query;
            //    }

            //    return umbRequestHelper.resourcePromise(
            //            $http.post(umbRequestHelper.getApiUrl('merchelloReportSalesByItem', 'ExportByDateRange'), listQuery),
            //            'Failed to retreive report data from the service');
            //}
        };
    };

    angular.module('umbraco.resources').factory('merchelloPluginReportSalesByItemService', ['$http', 'umbRequestHelper', merchello.Services.ReportPluginSalesByItem]);

}(window.merchello.Services = window.merchello.Services || {}));