/**********************************************************\
|                                                          |
|                          hprose                          |
|                                                          |
| Official WebSite: http://www.hprose.com/                 |
|                   http://www.hprose.net/                 |
|                   http://www.hprose.org/                 |
|                                                          |
\**********************************************************/

/**********************************************************\
 *                                                        *
 * HarmonyMaps.js                                         *
 *                                                        *
 * Harmony Maps for HTML5.                                *
 *                                                        *
 * LastModified: Mar 27, 2014                             *
 * Author: Ma Bingyao <andot@hprose.com>                  *
 *                                                        *
\**********************************************************/

(function (global) {
    'use strict';

    var hasWeakMap = 'WeakMap' in global;
    var hasMap = 'Map' in global;
    var hasForEach = true;

    if (hasMap) {
        hasForEach = 'forEach' in new global.Map();
    }

    if (hasWeakMap && hasMap && hasForEach) return;

    var namespaces = Object.create(null);
    var count = 0;
    var reDefineValueOf = function (obj) {
        var privates = Object.create(null);
        var baseValueOf = obj.valueOf;
        Object.defineProperty(obj, 'valueOf', {
            value: function (namespace, n) {
                    if ((this === obj) &&
                        (n in namespaces) &&
                        (namespaces[n] === namespace)) {
                        if (!(n in privates)) privates[n] = Object.create(null);
                        return privates[n];
                    }
                    else {
                        return baseValueOf.apply(this, arguments);
                    }
                },
            writable: true,
            configurable: true,
            enumerable: false
        });
    };

    if (!hasWeakMap) {
        global.WeakMap = function WeakMap() {
            var namespace = Object.create(null);
            var n = count++;
            namespaces[n] = namespace;
            var map = function (key) {
                if (key !== Object(key)) throw new Error('value is not a non-null object');
                var privates = key.valueOf(namespace, n);
                if (privates !== key.valueOf()) return privates;
                reDefineValueOf(key);
                return key.valueOf(namespace, n);
            };
            var m = Object.create(WeakMap.prototype, {
                get: {
                    value: function (key) { return map(key).value; },
                    writable: false,
                    configurable: false,
                    enumerable: false
                },
                set: {
                    value: function (key, value) { map(key).value = value; },
                    writable: false,
                    configurable: false,
                    enumerable: false
                },
                has: {
                    value: function (key) { return 'value' in map(key); },
                    writable: false,
                    configurable: false,
                    enumerable: false
                },
                'delete': {
                    value: function (key) { return delete map(key).value; },
                    writable: false,
                    configurable: true,
                    enumerable: false
                },
                clear: {
                    value: function () {
                        delete namespaces[n];
                        n = count++;
                        namespaces[n] = namespace;
                    },
                    writable: false,
                    configurable: false,
                    enumerable: false
                }
            });
            if (arguments.length > 0 && Array.isArray(arguments[0])) {
                var iterable = arguments[0];
                for (var i = 0, len = iterable.length; i < len; i++) {
                    m.set(iterable[i][0], iterable[i][1]);
                }
            }
            return m;
        };
    }

    if (!hasMap) {
        var objectMap = function () {
            var namespace = Object.create(null);
            var n = count++;
            var nullMap = Object.create(null);
            namespaces[n] = namespace;
            var map = function (key) {
                if (key === null) return nullMap;
                var privates = key.valueOf(namespace, n);
                if (privates !== key.valueOf()) return privates;
                reDefineValueOf(key);
                return key.valueOf(namespace, n);
            };
            return {
                get: function (key) { return map(key).value; },
                set: function (key, value) { map(key).value = value; },
                has: function (key) { return 'value' in map(key); },
                'delete': function (key) { return delete map(key).value; },
                clear: function () {
                    delete namespaces[n];
                    n = count++;
                    namespaces[n] = namespace;
                }
            };
        };
        var noKeyMap = function () {
            var map = Object.create(null);
            return {
                get: function () { return map.value; },
                set: function (_, value) { map.value = value; },
                has: function () { return 'value' in map; },
                'delete': function () { return delete map.value; },
                clear: function () { map = Object.create(null); }
            };
        };
        var numberMap = function () {
            var map = Object.create(null);
            var isNegZero = function(value) {
                return (value === 0 && 1/value === -Infinity);
            };
            var negZeroMap = noKeyMap();
            return {
                get: function (key) { return isNegZero(key) ? negZeroMap.get() : map[key]; },
                set: function (key, value) {
                    if (isNegZero(key)) {
                        negZeroMap.set(key, value);
                    }
                    else {
                        map[key] = value;
                    }
                },
                has: function (key) { return isNegZero(key) ? negZeroMap.has() : key in map; },
                'delete': function (key) { return isNegZero(key) ? negZeroMap['delete']() : delete map[key]; },
                clear: function () { negZeroMap.clear(); map = Object.create(null); }
            };
        };
        var scalarMap = function () {
            var map = Object.create(null);
            return {
                get: function (key) { return map[key]; },
                set: function (key, value) { map[key] = value; },
                has: function (key) { return key in map; },
                'delete': function (key) { return delete map[key]; },
                clear: function () { map = Object.create(null); }
            };
        };
        global.Map = function Map() {
            var map = {
                'number': numberMap(),
                'string': scalarMap(),
                'boolean': scalarMap(),
                'object': objectMap(),
                'function': objectMap(),
                'unknown': objectMap(),
                'undefined': noKeyMap(),
                'null': noKeyMap()
            };
            var size = 0;
            var keys = [];
            var m = Object.create(Map.prototype, {
                size: {
                    get : function () { return size; },
                    configurable: false,
                    enumerable: false
                },
                get: {
                    value: function (key) {
                        return map[typeof(key)].get(key);
                    },
                    writable: false,
                    configurable: false,
                    enumerable: false
                },
                set: {
                    value: function (key, value) {
                        if (!this.has(key)) {
                            keys.push(key);
                            size++;
                        }
                        map[typeof(key)].set(key, value);
                    },
                    writable: false,
                    configurable: false,
                    enumerable: false
                },
                has: {
                    value: function (key) {
                        return map[typeof(key)].has(key);
                    },
                    writable: false,
                    configurable: false,
                    enumerable: false
                },
                'delete': {
                    value: function (key) {
                        if (this.has(key)) {
                            size--;
                            keys.splice(keys.indexOf(key), 1);
                            return map[typeof(key)]['delete'](key);
                        }
                        return false;
                    },
                    writable: false,
                    configurable: false,
                    enumerable: false
                },
                clear: {
                    value: function () {
                        keys.length = 0;
                        for (var key in map) map[key].clear();
                        size = 0;
                    },
                    writable: false,
                    configurable: false,
                    enumerable: false
                },
                forEach: {
                    value: function (callback, thisArg) {
                        for (var i = 0, n = keys.length; i < n; i++) {
                            callback.call(thisArg, this.get(keys[i]), keys[i], this);
                        }
                    },
                    writable: false,
                    configurable: false,
                    enumerable: false
                }
            });
            if (arguments.length > 0 && Array.isArray(arguments[0])) {
                var iterable = arguments[0];
                for (var i = 0, len = iterable.length; i < len; i++) {
                    m.set(iterable[i][0], iterable[i][1]);
                }
            }
            return m;
        };
    }

    if (!hasForEach) {
        var OldMap = global.Map;
        global.Map = function Map() {
            var map = new OldMap();
            var size = 0;
            var keys = [];
            var m = Object.create(Map.prototype, {
                size: {
                    get : function () { return size; },
                    configurable: false,
                    enumerable: false
                },
                get: {
                    value: function (key) {
                        return map.get(key);
                    },
                    writable: false,
                    configurable: false,
                    enumerable: false
                },
                set: {
                    value: function (key, value) {
                        if (!map.has(key)) {
                            keys.push(key);
                            size++;
                        }
                        map.set(key, value);
                    },
                    writable: false,
                    configurable: false,
                    enumerable: false
                },
                has: {
                    value: function (key) {
                        return map.has(key);
                    },
                    writable: false,
                    configurable: false,
                    enumerable: false
                },
                'delete': {
                    value: function (key) {
                        if (map.has(key)) {
                            size--;
                            keys.splice(keys.indexOf(key), 1);
                            return map['delete'](key);
                        }
                        return false;
                    },
                    writable: false,
                    configurable: false,
                    enumerable: false
                },
                clear: {
                    value: function () {
                        if ('clear' in map) {
                            map.clear();
                        }
                        else {
                            for (var i = 0, n = keys.length; i < n; i++) {
                                map['delete'](keys[i]);
                            }
                        }
                        keys.length = 0;
                        size = 0;
                    },
                    writable: false,
                    configurable: false,
                    enumerable: false
                },
                forEach: {
                    value: function (callback, thisArg) {
                        for (var i = 0, n = keys.length; i < n; i++) {
                            callback.call(thisArg, this.get(keys[i]), keys[i], this);
                        }
                    },
                    writable: false,
                    configurable: false,
                    enumerable: false
                }
            });
            if (arguments.length > 0 && Array.isArray(arguments[0])) {
                var iterable = arguments[0];
                for (var i = 0, len = iterable.length; i < len; i++) {
                    m.set(iterable[i][0], iterable[i][1]);
                }
            }
            return m;
        };
    }
})(this);
