#!/usr/bin/env node

import yargs from 'yargs/yargs';
import {hideBin} from 'yargs/helpers';

import Flush from './utils/commands/flush.js';
import Backup from './utils/commands/backup.js';
import Update from './utils/commands/update.js';
import PM2Manager from './utils/pm2/manager.js';
import Install from './utils/commands/install.js';
import Restart from './utils/commands/restart.js';
import Uninstall from './utils/commands/uninstall.js';

yargs(hideBin(process.argv))
    .usage('ghosler [cmd]')
    .command('install', 'Install Ghosler from its GitHub source.', async () => await Install.doInstall())
    .command('update', 'Check and update Ghosler if available.', async () => await Update.doUpdate())
    .command('restart', 'Restart Ghosler if you made any changes to source.', async () => await Restart.doRestart())
    .command('flush', 'Flush all of Ghosler Logs', () => Flush.doFlush())
    .command('backup', 'Backup Ghosler instance.', async () => await Backup.doBackup())
    .command('uninstall', 'Remove Ghosler, its all data and configurations completely.', () => Uninstall.doUninstall())
    .command('logs [type]', 'Print logs for Ghosler, Type: error, out.', (yargs) => {
            yargs.positional('type', {
                describe: 'Type of log to print',
                choices: ['error', 'out'], default: 'out'
            });
        }, (argv) => PM2Manager.logs(argv.type)
    )
    .help()
    .version('1.0.81') // doesn't read from package.json for some reason.
    .argv;