import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

export class Prompter {
  private readonly prompt = createInterface({ input: stdin, output: stdout });

  async text(label: string, initial = ""): Promise<string> {
    const suffix = initial ? ` (${initial})` : "";
    return (await this.prompt.question(`${label}${suffix}: `)).trim() || initial;
  }

  async select<T extends string>(label: string, choices: readonly { value: T; label: string }[], initial: T): Promise<T> {
    console.log(`\n${label}:`);
    choices.forEach((choice, index) => console.log(`  ${index + 1}. ${choice.label}${choice.value === initial ? " (default)" : ""}`));
    const answer = await this.prompt.question("> ");
    if (!answer.trim()) return initial;
    const selected = choices[Number(answer) - 1];
    if (!selected) throw new Error(`Please choose a number from 1 to ${choices.length}.`);
    return selected.value;
  }

  async confirm(label: string, initial = true): Promise<boolean> {
    const answer = (await this.prompt.question(`${label} ${initial ? "[Y/n]" : "[y/N]"} `)).trim().toLowerCase();
    return answer ? answer === "y" || answer === "yes" : initial;
  }

  close(): void { this.prompt.close(); }
}
