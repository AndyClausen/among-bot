import {
  Choices,
  ChoicesType,
  Client,
  Discord,
  Group,
  Guard,
  Option,
  OptionType,
  Slash,
} from '@typeit/discord';
import { DocumentType } from '@typegoose/typegoose';

import ConfigModel, { Config as ConfigClass } from '../db/models/config';
import { Server } from '../db/models/server';
import IsValidKey from '../guards/config/is-valid-key';
import ServerExists from '../guards/config/server-exists';
import GuardCache from '../types/GuardCache';
import { IsAdmin } from '../guards/commands/is-admin';
import { CommandInteraction } from 'discord.js';

@Discord()
@Guard(ServerExists, IsAdmin)
@Group('config')
export default class Config {
  private readonly validBooleans: ReadonlyArray<string | number> = ['true', 'false', 1, 0];

  @Slash('list')
  async list(
    interaction: CommandInteraction,
    client: Client,
    { server }: GuardCache
  ): Promise<void> {
    let str = 'Current configuration: \n```\n';
    Object.keys(ConfigModel.schema.paths).forEach(
      (k: keyof ConfigClass) => (str += `${k}: ${server.config[k]}\n`)
    );
    str += '```';
    await interaction.reply(str, { ephemeral: true });
  }

  @Slash('enable')
  @Guard(IsValidKey)
  async enable(
    @Choices(
      Object.keys(ConfigModel.schema.paths)
        .filter(ConfigClass.isBooleanProp)
        .reduce<ChoicesType>((obj, key) => {
          obj[key] = key;
          return obj;
        }, {})
    )
    @Option('key', OptionType.STRING, { required: true })
    key: keyof ConfigClass,
    interaction: CommandInteraction,
    client: Client,
    { server }: GuardCache
  ): Promise<void> {
    await this.toggle(key, interaction, client, server, true);
  }

  @Slash('disable')
  @Guard(IsValidKey)
  async disable(
    @Choices(
      Object.keys(ConfigModel.schema.paths).reduce<ChoicesType>((obj, key) => {
        obj[key] = key;
        return obj;
      }, {})
    )
    @Option('key', OptionType.STRING, { required: true })
    key: keyof ConfigClass,
    interaction: CommandInteraction,
    client: Client,
    { server }: GuardCache
  ): Promise<void> {
    await this.toggle(key, interaction, client, server, false);
  }

  async toggle(
    key: keyof ConfigClass,
    interaction: CommandInteraction,
    client: Client,
    server: DocumentType<Server>,
    toggle: boolean
  ): Promise<void> {
    if (!ConfigClass.isBooleanProp(key)) {
      await interaction.reply(`${key} is not a boolean!`, { ephemeral: true });
      return;
    }

    server.config[key] = toggle;
    await server.save();
    await interaction.reply(`${key} has been ${toggle ? 'enabled' : 'disabled'}`, {
      ephemeral: true,
    });
  }

  @Slash('set')
  @Guard(IsValidKey)
  async set(
    @Choices(
      Object.keys(ConfigModel.schema.paths).reduce<ChoicesType>((obj, key) => {
        obj[key] = key;
        return obj;
      }, {})
    )
    @Option('key', OptionType.STRING, { required: true })
    key: keyof ConfigClass,
    @Option('value', { required: true })
    value: string,
    interaction: CommandInteraction,
    client: Client,
    { server }: GuardCache
  ): Promise<void> {
    if (!ConfigClass.isValidKey(key)) {
      await interaction.reply(`Invalid key ${key}!`, { ephemeral: true });
      return;
    }

    if (ConfigClass.isStringProp(key)) {
      server.config[key] = value;
    } else if (ConfigClass.isNumberProp(key)) {
      const numValue = Number(value);
      if (!numValue) {
        await interaction.reply('Please enter a valid number', { ephemeral: true });
        return;
      }
      if (key === 'susChance') {
        if (numValue <= 0 || numValue > 1) {
          await interaction.reply('Please enter a number between 0 and 1', { ephemeral: true });
          return;
        }
      }
      server.config[key] = numValue;
    } else if (ConfigClass.isBooleanProp(key)) {
      if (!this.validBooleans.includes(value)) {
        await interaction.reply(
          `Invalid value '${value}' for key '${key}'! Valid values: ${this.validBooleans.join(
            ', '
          )}`
        );
        return;
      }
      server.config[key] = ['true', 1].includes(value);
    } else {
      await interaction.reply('Unknown type! Please report this to Andy.', { ephemeral: true });
      return;
    }
    await server.save();
    await interaction.reply(`${key} has been set to ${server.config[key]}`, { ephemeral: true });
  }

  @Slash('get')
  @Guard(IsValidKey)
  async get(
    @Choices(
      Object.keys(ConfigModel.schema.paths).reduce<ChoicesType>((obj, key) => {
        obj[key] = key;
        return obj;
      }, {})
    )
    @Option('key', OptionType.STRING, { required: true })
    key: keyof ConfigClass,
    interaction: CommandInteraction,
    client: Client,
    { server }: GuardCache
  ): Promise<void> {
    if (!ConfigClass.isValidKey(key)) {
      await interaction.reply(`Invalid key ${key}!`, { ephemeral: true });
      return;
    }
    await interaction.reply(`${key}: ${server.config[key]}`, { ephemeral: true });
  }
}
