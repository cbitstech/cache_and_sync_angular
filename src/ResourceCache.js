(function() {
  'use strict';

  /*
   * Uses local storage to store each resource collection in a serialized
   * string.
   */
  function ResourceCache($window, $filter) {
    function storage() {
      return $window.localStorage;
    }

    // Strips internal metadata from the deserialized resources.
    function removeMetaData(data) {
      var copied = angular.copy(data);

      if (typeof data.length === 'undefined') {
        copied = [copied];
      }

      angular.forEach(copied, function(record) {
        delete record.isDirty;
      });

      return copied;
    }

    // Delegates cache methods from a host object.
    this.delegate = function(context, methodName) {
      var self = this;

      context[methodName] = function() {
        var args = [context.KEY].concat(Array.prototype.slice.call(arguments));

        return self[methodName].apply(self, args);
      };
    };

    // Saves the datum in serialized form to local storage.
    this.persist = function(key, datum) {
      if (typeof datum === 'undefined' || datum === null) {
        return;
      }

      var data = this.fetchAll(key),
          rawData = this.fetchAllRaw(key),
          record = angular.copy(datum),
          isRejected = false;

      // Reject duplicates.
      angular.forEach(data, function(d) {
        if (angular.equals(removeMetaData(record)[0], d)) {
          isRejected = true;

          return;
        }
      });

      if (!isRejected) {
        if (record.isDirty !== false) {
          record.isDirty = true;
        }

        storage()[key] = JSON.stringify(rawData.concat(record));
      }
    };

    // Returns the first datum in the set, or null.
    this.first = function(key) {
      var data = this.fetchAll(key);

      return data[0] || null;
    };

    // Returns the first datum with a matching id, or null.
    this.fetch = function(key, id) {
      var data = this.fetchAll(key);

      for (var i = 0; i < data.length; i++) {
        if (data[i].id === id) {
          return data[i];
        }
      }

      return null;
    };

    // Sets the isDirty property to false. A cache must implement this method if
    // it is to be synchronized with the server.
    this.markClean = function(key, id) {
      var data = this.fetchAllRaw(key);

      for (var i = 0; i < data.length; i++) {
        if (data[i].id === id) {
          data[i].isDirty = false;
        }
      }

      storage()[key] = JSON.stringify(data);
    };

    // Returns the array of all data, including internal metadata.
    this.fetchAllRaw = function(key) {
      var records = storage()[key] || '[]';

      return JSON.parse(records);
    };

    // Returns the array of all data, or an empty array.
    this.fetchAll = function(key) {
      var records = this.fetchAllRaw(key);

      return removeMetaData(records);
    };

    // Returns the array of all dirty data, or an empty array.
    this.fetchAllDirty = function(key) {
      var records = $filter('filter')(this.fetchAllRaw(key),
                                      { isDirty: true }, true);

      return removeMetaData(records);
    };

    // Removes the data and key.
    this.destroyAll = function(key) {
      storage().removeItem(key);
    };
  }

  function ResourceCacheFactory($window, $filter) {
    return new ResourceCache($window, $filter);
  }

  angular.module('CacheAndSync')
         .constant('ResourceCache', ResourceCache)
         .factory('resourceCache',
                  ['$window', '$filter', ResourceCacheFactory]);
})();
