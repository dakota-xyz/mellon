import { addressesCommand } from "./commands/addressesCmd";
import { balancesCommand } from "./commands/balancesCmd";
import { sendCommand } from "./commands/sendCmd";
import * as commander from "commander";

const main = () => {
  const program = new commander.Command();
  program.addCommand(addressesCommand());
  program.addCommand(balancesCommand());
  program.addCommand(sendCommand());

  try {
    program
      .version("1.0.0")
      .description("Simple Account Abstraction CLI")
      .parse(process.argv);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
main();
