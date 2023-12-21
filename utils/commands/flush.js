import fs from 'fs';
import Utils from '../utils.js';
import PM2Manager from '../pm2/manager.js';

/**
 * Class that performs flushing of logs.
 */
export default class Flush {

    /**
     * Start the flush task.
     */
    static doFlush() {
        if (!Utils.isGhoslerInstalled()) {
            Utils.logFail('You sure that Ghosler is installed in this directory?');
            return;
        }

        Utils.logStart('Flushing logs...');

        PM2Manager.flush();

        this.#clearLogFile('error');
        this.#clearLogFile('debug');

        Utils.logSucceed('Logs flushed.');
    }

    static #clearLogFile(logType) {
        const logFilePath = `.logs/${logType}.log`;
        if (fs.existsSync(logFilePath)) fs.writeFileSync(logFilePath, '');
    }
}