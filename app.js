#!/usr/bin/env node

// yargs imports
import yargs from 'yargs/yargs';
import {hideBin} from 'yargs/helpers';

// utils import
import Utils from './utils/utils.js';

// command imports
import Ls from './utils/commands/ls.js';
import Logs from './utils/commands/logs.js';
import Stop from './utils/commands/stop.js';
import Flush from './utils/commands/flush.js';
import Backup from './utils/commands/backup.js';
import Update from './utils/commands/update.js';
import Migrate from './utils/commands/migrate.js';
import Install from './utils/commands/install.js';
import Restart from './utils/commands/restart.js';
import Uninstall from './utils/commands/uninstall.js';

// start yargs
yargs(hideBin(process.argv))
    .usage('ghosler [cmd]')
    .command(Ls.yargsCommand())
    .command(Stop.yargsCommand())
    .command(Logs.yargsCommand())
    .command(Flush.yargsCommand())
    .command(Update.yargsCommand())
    .command(Backup.yargsCommand())
    .command(Migrate.yargsCommand())
    .command(Install.yargsCommand())
    .command(Restart.yargsCommand())
    .command(Uninstall.yargsCommand())
    .help()
    .version(Utils.cliPackageVersion)
    .alias('h', 'help')
    .alias('v', 'version')
    .argv;