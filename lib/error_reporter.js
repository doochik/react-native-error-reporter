'use strict';

import {Alert} from 'react-native';

const RNFS = require('./native_sourcemap_loader');
const stacktraceParser = require('stacktrace-parser');
const SourceMap = require('source-map');
import {Crashlytics} from 'react-native-fabric';

const sourceMap = RNFS.readSourcemaps('utf8')
    .then((data) => {
        if (!data) {
            return Promise.reject()
        }

        return Promise.resolve(new SourceMap.SourceMapConsumer(data))
    });

function init() {
    if (__DEV__) {
        // Don't send exceptions from __DEV__, it's way too noisy!
        // Live reloading and hot reloading in particular lead to tons of noise...
        return;
    }

    var originalHandler = global.ErrorUtils.getGlobalHandler();

    function errorHandler(e, isFatal) {
        sourceMap
            .then((sourceMap) => {
                var stack = Array.isArray(e.stack) ? e.stack : stacktraceParser.parse(e.stack);
                // var framesToPop = e.framesToPop || 0;
                // while (framesToPop--) {
                //     stack.shift();
                // }

                stack.forEach(frame => {
                    resolveSourceMaps(sourceMap, frame);
                });

                Alert('test', stack);
                Crashlytics.recordCustomExceptionName(e.message, e.message, stack)
            })
            .catch(callOriginalHandler);

        function callOriginalHandler() {
            // And then re-throw the exception with the original handler
            if (originalHandler) {
                originalHandler(e, isFatal);
            }
        }

        // StackTrace.fromError(e, {offline: true}).then((x)=>Crashlytics.recordCustomExceptionName(e.message, e.message, x));
    }

    global.ErrorUtils.setGlobalHandler(errorHandler);
}

module.exports = {
    init
}
