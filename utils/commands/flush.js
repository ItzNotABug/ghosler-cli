import fs from 'fs';
import Utils from '../utils.js';
import PM2Manager from '../pm2/manager.js';
import BaseCommand from './base/command.js';

/**
 * Class that performs flushing of logs.
 */
export default class Flush extends BaseCommand {

    static yargsCommand() {
        return {
            command: 'flush',
            description: 'Flush all of Ghosler Logs.',
            builder: (yargs) => {
                return yargs.option('name', {
                    type: 'string',
                    description: 'Name of the Ghosler instance for which to flush logs',
                });
            }, handler: (argv) => this.#performTask(argv)
        };
    }

    /**
     * Start the flush task.
     *
     * @param argv {Object} - `yargs` argument object containing user input.
     * @returns {Promise<void>} - Nothing.
     */
    static async #performTask(argv) {
        const canProceed = await this.canProceed(argv);
        if (!canProceed) return;

        Utils.logStart('Flushing logs...');

        await PM2Manager.flush(argv.name);

        this.#clearLogFile('error');
        this.#clearLogFile('debug');

        Utils.logSucceed('Logs flushed.');
    }

    /**
     * Clear a log file based on the provided log type.
     *
     * @param logType `error` or `debug`.
     */
    static #clearLogFile(logType) {
        const logFilePath = `.logs/${logType}.log`;
        if (fs.existsSync(logFilePath)) fs.writeFileSync(logFilePath, '');
    }
}