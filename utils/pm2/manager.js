import chalk from 'chalk';
import Utils from '../utils.js';
import {execSync} from 'child_process';

export default class PM2Manager {

    static #productionEnv = 'NODE_ENV=production';

    /**
     * Installs dependencies and registers the application with PM2.\
     * It executes `npm ci` to install dependencies followed by starting the app with PM2.
     *
     * @returns {Promise<string>} A promise that resolves to the string 'Done' if the app is registered and running,
     *                            or a placeholder error message if the app fails to start.
     */
    static async register() {
        execSync(`${this.#productionEnv} npm ci --omit-dev && ${this.#productionEnv} pm2 start app.js --no-autorestart --name ghosler-app`);
        const runningFine = await this.#checkIfAppOnline();
        if (!runningFine) {
            return 'There was a problem starting out Ghosler. See logs via `ghosler logs error`';
        } else return 'Done';
    }

    /**
     * Restarts the Ghosler application.\
     * If the npm parameter is true, it also installs dependencies before restarting, which is useful for updates.
     *
     * @param {boolean} npm If true, the installations dependencies before restarting the app.
     * @returns {Promise<string>} A promise that resolves to the string 'Done' if the app restarts successfully,
     *                            or a placeholder error message if the restart fails.
     */
    static async restart(npm = false) {
        if (npm) execSync(`pm2 stop ghosler-app && ${this.#productionEnv} npm ci --omit-dev && ${this.#productionEnv} pm2 restart ghosler-app`);
        else execSync('pm2 restart ghosler-app');

        const runningFine = await this.#checkIfAppOnline();
        if (!runningFine) {
            return 'There was a problem restarting out Ghosler. See logs via `ghosler logs error`';
        } else return 'Done';
    }

    /**
     * Retrieves and prints logs managed by PM2 for the Ghosler application.\
     *
     * @param {string} type The type of logs to retrieve: 'error' for error logs, 'out' for standard output.
     */
    static logs(type) {
        let logs = execSync(`pm2 logs ghosler-app ${type === 'error' ? '--err' : '--out'} --nostream`).toString();

        let lines = logs.split('\n');
        lines = lines.filter(line => !line.includes('[TAILING]') && !line.includes('.pm2/logs/'));
        logs = lines.join('\n');

        type === 'error' ? console.log(chalk.red(logs)) : console.log(logs);
    }

    /**
     * Removes the Ghosler application from PM2.
     */
    static uninstall() {
        execSync('pm2 delete ghosler-app');
    }

    /**
     * Flushes all logs of the Ghosler application recorded by PM2.
     */
    static flush() {
        execSync('pm2 flush ghosler-app');
    }

    /**
     * Generates a startup script for the Ghosler application using PM2.\
     * The script ensures that the app starts automatically after a system reboot.\
     * Requires current user to have root (`sudo`) privileges.
     *
     * @returns {Promise<string>} A promise that resolves to the startup script, which should be executed with sudo.
     */
    static async startup() {
        const result = await execSync('pm2 startup');
        const commandLine = result.split('\n').find(line => line.trim().startsWith('sudo'));
        const command = commandLine ? commandLine.trim() : 'na';

        if (command !== 'na') execSync(command);
    }

    /**
     * Generates an unstartup script for the Ghosler application using PM2.\
     * Requires current user to have root (`sudo`) privileges.
     *
     * @returns {Promise<string>} A promise that resolves to the startup script, which should be executed with sudo.
     */
    static async unstartup() {
        const result = await execSync('pm2 unstartup');
        const commandLine = result.split('\n').find(line => line.trim().includes('sudo'));
        const command = commandLine ? commandLine.trim() : 'na';

        if (command !== 'na') execSync(command);
    }

    /**
     * Checks if the Ghosler app is online and operational. The  includes a delay
     * to accommodate the startup time of the application, as an immediate check might
     * falsely report the app as online even if it eventually fails to start.
     *
     * @returns {Promise<boolean>} A promise that resolves to true if the app is online and operational,
     *                             false otherwise.
     */
    static async #checkIfAppOnline() {
        await Utils.sleep(10000);
        return execSync('pm2 describe ghosler-app').toString().includes('online');
    }
}