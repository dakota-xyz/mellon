import "dotenv/config";
import { addressCommand } from "./commands/addressCmd";
import { balanceCommand } from "./commands/balanceCmd";
import { sendCommand } from "./commands/sendCmd";
import * as commander from "commander";

const program = new commander.Command();
program.addCommand(addressCommand());
program.addCommand(balanceCommand());
program.addCommand(sendCommand());

program
  .version("1.0.0")
  .description("Simple Account Abstraction CLI")
  .parse(process.argv);
