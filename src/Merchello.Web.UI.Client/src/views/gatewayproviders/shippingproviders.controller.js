angular.module('merchello').controller('Merchello.Backoffice.ShippingProvidersController',
    ['$scope', 'notificationsService', 'dialogService',
    'settingsResource', 'warehouseResource', 'shippingGatewayProviderResource',
    'settingDisplayBuilder', 'warehouseDisplayBuilder', 'countryDisplayBuilder', 'shippingGatewayProviderDisplayBuilder',
    'gatewayResourceDisplayBuilder', 'shipCountryDisplayBuilder',
    function($scope, notificationsService, dialogService,
             settingsResource, warehouseResource, shippingGatewayProviderResource,
             settingDisplayBuilder, warehouseDisplayBuilder, countryDisplayBuilder, shippingGatewayProviderDisplayBuilder,
             gatewayResourceDisplayBuilder, shipCountryDisplayBuilder) {

        $scope.loaded = true;
        $scope.countries = [];
        $scope.warehouses = [];
        $scope.primaryWarehouse = {};
        $scope.selectedCatalog = {};
        $scope.primaryWarehouseAddress = {};
        $scope.visible = {
            catalogPanel: true,
            shippingMethodPanel: true,
            warehouseInfoPanel: false,
            warehouseListPanel: true
        };

        // exposed methods
        $scope.addCountry = addCountry;

        //--------------------------------------------------------------------------------------
        // Initialization methods
        //--------------------------------------------------------------------------------------

        /**
         * @ngdoc method
         * @name init
         * @function
         *
         * @description
         * Method called on intial page load.  Loads in data from server and sets up scope.
         */
        function init() {
            loadWarehouses();
        }

        /**
         * @ngdoc method
         * @name loadWarehouses
         * @function
         *
         * @description
         * Load the warehouses from the warehouse service, then wrap the results
         * in Merchello models and add to the scope via the warehouses collection.
         * Once loaded, it calls the loadCountries method.
         */
        function loadWarehouses() {
            var promiseWarehouses = warehouseResource.getDefaultWarehouse(); // Only a default warehouse in v1
            promiseWarehouses.then(function (warehouses) {
                $scope.warehouses.push(warehouseDisplayBuilder.transform(warehouses));
                changePrimaryWarehouse();
                loadCountries();
                //loadAllShipProviders();
            }, function (reason) {
                notificationsService.error("Warehouses Load Failed", reason.message);
            });
        }

        /**
         * @ngdoc method
         * @name loadCountries
         * @function
         *
         * @description
         * Load the countries from the shipping service, then wrap the results
         * in Merchello models and add to the scope via the countries collection.
         * Once loaded, it calls the loadCountryProviders method for each
         * country.
         */
        function loadCountries() {
            if ($scope.primaryWarehouse.warehouseCatalogs.length > 0) {
                var catalogKey = $scope.selectedCatalog.key;
                var promiseShipCountries = shippingGatewayProviderResource.getWarehouseCatalogShippingCountries(catalogKey);
                promiseShipCountries.then(function (shipCountries) {
                    $scope.countries = _.sortBy(shipCountryDisplayBuilder.transform(shipCountries), function(country) {
                        return country.name;
                    });
                    var elseCountry = _.find($scope.countries, function(country) {
                        return country.countryCode === 'ELSE';
                    });
                    if(elseCountry !== null && elseCountry !== undefined) {
                        $scope.countries = _.reject($scope.countries, function(country) {
                            return country.countryCode === 'ELSE';
                        });
                        $scope.countries.push(elseCountry);
                    }
                    loadAllAvailableCountries();
                    $scope.loaded = true;
                    $scope.preValuesLoaded = true;
                }, function (reason) {
                    notificationsService.error("Shipping Countries Load Failed", reason.message);
                });
            }
        }

        /**
         * @ngdoc method
         * @name loadAllAvailableCountries
         * @function
         *
         * @description
         * Load the countries from the settings service, then wrap the results
         * in Merchello models and add to the scope via the availableCountries collection.
         */
        function loadAllAvailableCountries() {
            var promiseAllCountries = settingsResource.getAllCountries();
            promiseAllCountries.then(function (allCountries) {
                var countries = countryDisplayBuilder.transform(allCountries);

                // Add Everywhere Else as an option
                var elseCountry = countryDisplayBuilder.createDefault();
                elseCountry.key = '7501029f-5ab3-4733-935d-1dd37b37bf8';
                elseCountry.countryCode = 'ELSE';
                // TODO this should be localized
                elseCountry.name = 'Everywhere Else';
                countries.push(elseCountry);

                // we only want available countries that are not already in use
                $scope.availableCountries = _.sortBy(
                    _.filter(countries, function(country) {
                        var found = _.find($scope.countries, function(assigned) {
                            return country.countryCode === assigned.countryCode;
                        });
                        return found === undefined || found === null;
                    }), function(country) {
                        return country.name;
                    });
                console.info($scope.availableCountries);

            }, function (reason) {
                notificationsService.error("Available Countries Load Failed", reason.message);
            });
        }

        /**
         * @ngdoc method
         * @name loadAllAvailableGatewayResources
         * @function
         *
         * @description
         * Load the shipping gateway resources from the shipping gateway service, then wrap the results
         * in Merchello models and add to the scope via the providers collection in the resources collection.

        function loadAllAvailableGatewayResources(shipProvider) {
            var promiseAllResources = shippingGatewayProviderResource.getAllShipGatewayResourcesForProvider(shipProvider);
            promiseAllResources.then(function (allResources) {
                shipProvider.resources = gatewayResourceDisplayBuilder.transform(allResources);
            }, function (reason) {
                notificationsService.error("Available Gateway Resources Load Failed", reason.message);
            });
        };
         */

        /**
         * @ngdoc method
         * @name loadAllShipProviders
         * @function
         *
         * @description
         * Load the shipping gateway providers from the shipping gateway service, then wrap the results
         * in Merchello models and add to the scope via the providers collection.

        function loadAllShipProviders() {
            var promiseAllProviders = shippingGatewayProviderResource.getAllShipGatewayProviders();
            promiseAllProviders.then(function (allProviders) {
                $scope.providers = shippingGatewayProviderDisplayBuilder.transform(allProviders);
                loadCountries();
            }, function (reason) {
                notificationsService.error("Available Ship Providers Load Failed", reason.message);
            });
        }
         */


        //--------------------------------------------------------------------------------------
        // Helper methods
        //--------------------------------------------------------------------------------------

        /**
         * @ngdoc method
         * @name changePrimaryWarehouse
         * @function
         *
         * @description
         * Helper method to set the primary warehouse on the scope and to make sure the isDefault flag on
         * all warehouses is set properly.  If a warehouse is passed in, then it will find that warehouse
         * and set it as the primary and set isDefault to true.  All other warehouses will have their
         * isDefault flag reset to false.  If no warehouse is passed in (usually on loading data) then the
         * warehouse that has the isDefault == true will be set as the primary warehouse on the scope.
         */
        function changePrimaryWarehouse(warehouse) {
            $scope.primaryWarehouse = _.find($scope.warehouses, function(warehouse) {
                   return warehouse.isDefault;
            });
            $scope.primaryWarehouseAddress = $scope.primaryWarehouse.getAddress();
            changeSelectedCatalog();
        }

        /**
         * @ngdoc method
         * @name changeSelectedCatalog
         * @function
         *
         * @description
         * Helper method to change between the selected catalog on the screen. If catalogIndex is passed
         * in, then the function will select the catalog at that index if it exists. If it doesn't, then
         * choose the default warehouse.
         */
        function changeSelectedCatalog(catalogIndex) {
            if ((typeof catalogIndex) !== 'undefined') {
                if ($scope.primaryWarehouse.warehouseCatalogs.length > catalogIndex) {
                    $scope.selectedCatalog = $scope.primaryWarehouse.warehouseCatalogs[catalogIndex];
                } else {
                    $scope.selectedCatalog = new merchello.Models.WarehouseCatalog();
                }
            } else {
                var foundDefault = false;
                for (var i = 0; i < $scope.primaryWarehouse.warehouseCatalogs.length; i++) {
                    if ($scope.primaryWarehouse.warehouseCatalogs[i].isDefault == true) {
                        $scope.selectedCatalog = $scope.primaryWarehouse.warehouseCatalogs[i];
                        foundDefault = true;
                    }
                }
                if (!foundDefault) {
                    $scope.selectedCatalog = $scope.primaryWarehouse.warehouseCatalogs[0];
                }
            }
        }



        //--------------------------------------------------------------------------------------
        // Event Handlers
        //--------------------------------------------------------------------------------------

        /**
         * @ngdoc method
         * @name deleteCountry
         * @function
         *
         * @description
         * Calls the shipping service to delete the country passed in via the country parameter.
         * When complete, the countries are reloaded from the api to get the latest from the database.
         *
         */
        function deleteCountryDialogConfirm(country) {

            var promiseDelete = merchelloCatalogShippingService.deleteShipCountry(country.key);
            promiseDelete.then(function () {

                notificationsService.success("Shipping Country Deleted");

                $scope.loadCountries();

            }, function (reason) {

                notificationsService.error("Shipping Country Delete Failed", reason.message);

            });
        }

        /**
         * @ngdoc method
         * @name removeMethodFromProviderDialogConfirmation
         * @function
         *
         * @description
         * Calls the fixed rate shipping service to delete the method passed in via the method parameter.
         * After method is deleted, reload the list of methods for that provider in that country.

        function removeMethodFromProviderDialogConfirmation(data) {
            var promiseDelete = merchelloCatalogShippingService.deleteShipMethod(data.method);
            promiseDelete.then(function () {
                data.provider.shipMethods = [];
                $scope.loadProviderMethods(data.provider, data.country);
                notificationsService.success("Shipping Method Deleted");
            }, function (reason) {
                notificationsService.error("Shipping Method Delete Failed", reason.message);
            });
        }
         */

        /**
         * @ngdoc method
         * @name removeMethodFromProviderDialog
         * @function
         *
         * @description
         * Opens the delete confirmation dialog via the Umbraco dialogService.
         * Country and provider passed through dialogService so that on confirm the provider's
         * methods can be reloaded after the method is deleted.

        function removeMethodFromProviderDialog(country, provider, method) {
            var dialogData = {
                country: country,
                name: method.name,
                method: method,
                provider: provider
            };
            dialogService.open({
                template: '/App_Plugins/Merchello/Common/Js/Dialogs/deleteconfirmation.html',
                show: true,
                callback: $scope.removeMethodFromProviderDialogConfirmation,
                dialogData: dialogData
            });
        }
         */

        //--------------------------------------------------------------------------------------
        // Dialog methods
        //--------------------------------------------------------------------------------------

        /**
         * @ngdoc method
         * @name addCountry
         * @function
         *
         * @description
         * Opens the add country dialog via the Umbraco dialogService.
         */
        function addCountry() {
            var dialogData = {};
            dialogData.availableCountries = $scope.availableCountries;
            dialogService.open({
                template: '/App_Plugins/Merchello/Backoffice/Merchello/Dialogs/shipping.addcountry.html',
                show: true,
                callback: addCountryDialogConfirm,
                dialogData: dialogData
            });
        }

        /**
         * @ngdoc method
         * @name addCountryDialogConfirm
         * @function
         *
         * @description
         * Handles the save after recieving the country to add from the dialog view/controller
         */
        function addCountryDialogConfirm(dialogData) {
            var countryOnCatalog = _.find($scope.countries, function (shipCountry) { return shipCountry.countryCode == dialogData.selectedCountry.countryCode; });
            if (!countryOnCatalog) {

                var catalogKey = $scope.selectedCatalog.key;

                var promiseShipCountries = merchelloCatalogShippingService.newWarehouseCatalogShippingCountry(catalogKey, dialogData.selectedCountry.countryCode);
                promiseShipCountries.then(function (shippingCountryFromServer) {

                    $scope.countries.push(new merchello.Models.ShippingCountry(shippingCountryFromServer));

                }, function (reason) {

                    notificationsService.error("Shipping Countries Create Failed", reason.message);

                });
            }
        }

        /**
         * @ngdoc method
         * @name addEditShippingMethodDialogOpen
         * @function
         *
         * @description
         * Opens the add/edit shipping method dialog via the Umbraco dialogService.
         */
        function addEditShippingMethodDialogOpen(country, gatewayProvider, method) {

            var dialogMethod = method;
            var provider;
            for (var i = 0; i < $scope.providers.length; i++) {
                if (gatewayProvider.key == $scope.providers[i].key) {
                    provider = new merchello.Models.GatewayProvider($scope.providers[i]);
                    provider.resources = _.map($scope.providers[i].resources, function (resource) {
                        return new merchello.Models.GatewayResource(resource);
                    });
                }
            }
            // If no method exists, create a new, blank one.
            if (!method) {
                dialogMethod = new merchello.Models.ShippingMethod();
                dialogMethod.shipCountryKey = country.key;
                dialogMethod.providerKey = gatewayProvider.key;
                dialogMethod.dialogEditorView.editorView = provider.dialogEditorView.editorView;
            } else {
                if (method.shipCountryKey === "00000000-0000-0000-0000-000000000000") {
                    method.shipCountryKey = country.key;
                }
            }

            // Acquire the provider's available resources.
            var availableResources = gatewayProvider.resources;

            // Get the editor template for the method's dialog.
            var templatePage = dialogMethod.dialogEditorView.editorView;

            var myDialogData = {
                method: dialogMethod,
                country: country,
                provider: gatewayProvider,
                gatewayResources: availableResources
            };
            dialogService.open({
                template: templatePage,
                show: true,
                callback: $scope.shippingMethodDialogConfirm,
                dialogData: myDialogData
            });
        }

        /**
         * @ngdoc method
         * @name addEditShippingProviderDialogOpen
         * @function
         *
         * @description
         * Opens the shipping provider dialog via the Umbraco dialogService.
         */
        function addEditShippingProviderDialogOpen(country, provider) {
            var dialogProvider = provider;
            if (!provider) {
                dialogProvider = new merchello.Models.ShippingGatewayProvider();
            }
            var providers = _.map($scope.providers, function (item) {
                var newProvider = new merchello.Models.GatewayProvider(item);
                newProvider.resources = _.map(item.resources, function (resource) {
                    return new merchello.Models.GatewayResource(resource);
                });
                return newProvider;
            });
            // Clean out any placeholder dropdown values for the providers' resources.
            for (var i = 0; i < providers.length; i++) {
                for (var j = 0; j < providers[i].resources.length; j++) {
                    if (providers[i].resources[j].serviceCode === '') {
                        providers[i].resources.splice(j, 1);
                        j -= 1;
                    }
                }
            }
            var myDialogData = {
                country: country,
                provider: dialogProvider,
                availableProviders: providers
            };
            dialogService.open({
                template: '/App_Plugins/Merchello/Modules/Settings/Shipping/Dialogs/shippingprovider.html',
                show: true,
                callback: $scope.shippingProviderDialogConfirm,
                dialogData: myDialogData
            });
        }

        /**
         * @ngdoc method
         * @name addEditWarehouseCatalogDialogOpen
         * @function
         *
         * @description
         * Opens the warehouse catalog dialog via the Umbraco dialogService.
         */
        function addEditWarehouseCatalogDialogOpen(warehouse, catalog) {

            var dialogCatalog = catalog;
            if (!catalog) {
                dialogCatalog = new merchello.Models.WarehouseCatalog();
            }

            var myDialogData = {
                warehouseKey: warehouse.key,
                catalog: dialogCatalog
            };

            dialogService.open({
                template: '/App_Plugins/Merchello/Modules/Settings/Shipping/Dialogs/shipping.addeditcatalog.html',
                show: true,
                callback: $scope.warehouseCatalogDialogConfirm,
                dialogData: myDialogData
            });

        }


        /**
         * @ngdoc method
         * @name deleteCatalog
         * @function
         *
         * @description
         * Opens the delete catalog dialog via the Umbraco dialogService.
         */
        function deleteCatalog() {
            var dialogData = {};
            dialogData.name = $scope.selectedCatalog.name;
            dialogData.catalog = $scope.selectedCatalog;
            dialogService.open({
                template: '/App_Plugins/Merchello/Common/Js/Dialogs/deleteconfirmation.html',
                show: true,
                callback: $scope.deleteCatalogConfirm,
                dialogData: dialogData
            });
        }

        /**
         * @ngdoc method
         * @name deleteCatalogConfirm
         * @function
         *
         * @description
         * Handles the delete after recieving the catalog to delete from the dialog view/controller
         */
        function deleteCatalogConfirm(data) {
            var selectedCatalog = new merchello.Models.WarehouseCatalog(data.catalog);
            var promiseDeleteCatalog = merchelloWarehouseService.deleteWarehouseCatalog(selectedCatalog.key);
            promiseDeleteCatalog.then(function (responseCatalog) {
                $scope.loadWarehouses();
            }, function (reason) {
                notificationsService.error('Catalog Delete Failed', reason.message);
            });
        }

        /**
         * @ngdoc method
         * @name addCountry
         * @function
         *
         * @description
         * Opens the add country dialog via the Umbraco dialogService.
         */
        function deleteCountryDialog(country) {
            var dialogData = {};
            dialogData = country;
            dialogService.open({
                template: '/App_Plugins/Merchello/Common/Js/Dialogs/deleteconfirmation.html',
                show: true,
                callback: $scope.deleteCountryDialogConfirm,
                dialogData: dialogData
            });
        }

        /**
         * @ngdoc method
         * @name deleteWarehouse
         * @function
         *
         * @description
         * Opens the delete warehouse dialog via the Umbraco dialogService.
         */
        function deleteWarehouse(warehouse) {
            if (warehouse != undefined) {
                dialogService.open({
                    template: '/App_Plugins/Merchello/Modules/Settings/Shipping/Dialogs/shipping.deletewarehouse.html',
                    show: true,
                    callback: $scope.deleteWarehouseDialogConfirm,
                    dialogData: warehouse
                });
            }
        }

        /**
         * @ngdoc method
         * @name deleteWarehouseDialogConfirm
         * @function
         *
         * @description
         * Handles the delete after recieving the warehouse to delete from the dialog view/controller
         */
        function deleteWarehouseDialogConfirm(warehouse) {

            // Todo: call API method to delete warehouse and then reload warehouses from API

        }

        /**
         * @ngdoc method
         * @name editRegionalShippingRatesDialogOpen
         * @function
         *
         * @description
         * Opens the edit regional shipping rates dialog via the Umbraco dialogService.
         */
        function editRegionalShippingRatesDialogOpen(country, provider, method) {

            var dialogMethod = method;
            var availableResources = provider.resources;
            var templatePage = '/App_Plugins/Merchello/Modules/Settings/Shipping/Dialogs/shippingregions.html';

            if (!method) {
                dialogMethod = new merchello.Models.ShippingMethod();
                dialogMethod.shipCountryKey = country.key;
                dialogMethod.providerKey = provider.key;
                dialogMethod.dialogEditorView.editorView = '/App_Plugins/Merchello/Modules/Settings/Shipping/Dialogs/shippingregions.html';
            }

            var myDialogData = {
                method: dialogMethod,
                country: country,
                provider: provider,
                gatewayResources: availableResources
            };

            dialogService.open({
                template: templatePage,
                show: true,
                callback: $scope.shippingMethodDialogConfirm,
                dialogData: myDialogData
            });

        }

        /**
         * @ngdoc method
         * @name selectCatalogDialogConfirm
         * @function
         *
         * @description
         * Handles the catalog selection after recieving the dialogData from the dialog view/controller
         */
        function selectCatalogDialogConfirm(data) {

            var index = data.filter.id;
            $scope.selectedCatalog = $scope.primaryWarehouse.warehouseCatalogs[index];
            $scope.countries = [];
            // Load the countries associated with this catalog.
            $scope.loadCountries();
        }

        /**
         * @ngdoc method
         * @name selectCatalogDialogOpen
         * @function
         *
         * @description
         * Opens the catalog selection dialog via the Umbraco dialogService.
         */
        function selectCatalogDialogOpen() {

            var availableCatalogs = [];
            var filter = availableCatalogs[0];
            for (var i = 0; i < $scope.primaryWarehouse.warehouseCatalogs.length; i++) {
                var catalog = {
                    id: i,
                    name: $scope.primaryWarehouse.warehouseCatalogs[i].name
                };
                availableCatalogs.push(catalog);
                if ($scope.primaryWarehouse.warehouseCatalogs[i].key == $scope.selectedCatalog.key) {
                    filter = availableCatalogs[i];
                }
            }
            var myDialogData = {
                availableCatalogs: availableCatalogs,
                filter: filter
            };
            dialogService.open({
                template: '/App_Plugins/Merchello/Modules/Settings/Shipping/Dialogs/shipping.selectcatalog.html',
                show: true,
                callback: $scope.selectCatalogDialogConfirm,
                dialogData: myDialogData
            });

        }

        /**
         * @ngdoc method
         * @name shippingMethodDialogConfirm
         * @function
         *
         * @description
         * Handles the edit after recieving the dialogData from the dialog view/controller
         */
        function shippingMethodDialogConfirm(data) {

            var promiseShipMethodSave = merchelloCatalogShippingService.saveShipMethod(data.method);
            promiseShipMethodSave.then(function() {
            }, function (reason) {
                notificationsService.error("Shipping Method Save Failed", reason.message);
            });
            data.provider.shipMethods = [];
            $scope.loadProviderMethods(data.provider, data.country);
        }

        /**
         * @ngdoc method
         * @name shippingProviderDialogConfirm
         * @function
         *
         * @description
         * Handles the edit after recieving the dialogData from the dialog view/controller
         */
        function shippingProviderDialogConfirm(data) {
            var selectedProvider = data.provider;
            var selectedResource = data.resource;
            var newShippingMethod = new merchello.Models.ShippingMethod();
            newShippingMethod.name = data.country.name + " " + selectedResource.name;
            newShippingMethod.providerKey = selectedProvider.key;
            newShippingMethod.serviceCode = selectedResource.serviceCode;
            newShippingMethod.shipCountryKey = data.country.key;
            var promiseAddMethod;
            promiseAddMethod = merchelloCatalogShippingService.addShipMethod(newShippingMethod);
            promiseAddMethod.then(function () {
                data.country.shippingGatewayProviders = [];
                $scope.loadCountryProviders(data.country);
            }, function (reason) {
                notificationsService.error("Shipping Provider / Initial Method Create Failed", reason.message);
            });
        }

        /**
         * @ngdoc method
         * @name warehouseCatalogDialogConfirm
         * @function
         *
         * @description
         * Handles the add/edit after recieving the dialogData from the dialog view/controller.
         * If the selectedCatalog is set to be default, ensure that original default is no longer default.
         */
        function warehouseCatalogDialogConfirm(data) {
            var selectedCatalog = new merchello.Models.WarehouseCatalog(data.catalog);
            var promiseUpdateCatalog;
            if (selectedCatalog.key === "") {
                promiseUpdateCatalog = merchelloWarehouseService.addWarehouseCatalog(selectedCatalog);
                selectedCatalog.warehouseKey = $scope.primaryWarehouse.key;
            } else {
                promiseUpdateCatalog = merchelloWarehouseService.putWarehouseCatalog(selectedCatalog);
            }
            promiseUpdateCatalog.then(function(responseCatalog) {
                $scope.loadWarehouses();
            }, function(reason) {
                notificationsService.error('Catalog Update Failed', reason.message);
            });
        }

        // initialize the controller
        init();


    }]);
