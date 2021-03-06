import { ArgsOf, GuardFunction } from '@typeit/discord';

import ServerModel from '../../db/models/server';
import GuardCache from '../../types/GuardCache';
import { CommandInteraction, MessageReaction } from "discord.js";

const ServerExists: GuardFunction<
  | ArgsOf<'message' | 'voiceStateUpdate' | 'messageReactionAdd' | 'messageReactionRemove'>
  | CommandInteraction,
  GuardCache
> = async (arg, client, next, nextObj) => {
  const messageOrInteraction = arg instanceof CommandInteraction ? arg : arg[0];
  const guild = messageOrInteraction instanceof MessageReaction
    ? messageOrInteraction.message.guild
    : messageOrInteraction.guild;
  if (!guild) {
    return;
  }
  const server = await ServerModel.findById(guild.id);
  if (!server) {
    if (messageOrInteraction instanceof CommandInteraction) {
      await messageOrInteraction.reply(
        `I may not have been configured properly! Please re-add me to your server or contact Andy.`
      );
    }
    return;
  }
  nextObj.server = server;
  await next();
};

export default ServerExists;
