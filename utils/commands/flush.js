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
        fs.writeFileSync('.logs/debug.log', '');
        fs.writeFileSync('.logs/error.log', '');

        Utils.logSucceed('Logs flushed.');
    }
}