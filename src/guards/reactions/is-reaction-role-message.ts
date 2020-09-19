import { GuardFunction } from '@typeit/discord';

import GuardCache from '../../types/GuardCache';

const IsReactionRoleMessage: GuardFunction<
  'messageReactionAdd' | 'messageReactionRemove',
  GuardCache
> = async ([reaction], client, next, { server }) => {
  if (reaction.message.id === server.reactionRolesMessageId) {
    await next();
  }
};

export default IsReactionRoleMessage;
