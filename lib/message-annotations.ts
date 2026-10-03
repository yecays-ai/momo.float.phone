import type { ChatMessage } from "./chat-storage";

/** Actor identity is independent of the message sender, including in group chats. */
export type MessageReactionActor =
    | { kind: "user"; id: string }
    | { kind: "character"; id: string };

export type MessageReaction = {
    actor: MessageReactionActor;
    emoji: string;
    createdAt: string;
};

export const LOCAL_REACTION_ACTOR: MessageReactionActor = { kind: "user", id: "local" };
export const MESSAGE_REACTION_CHOICES = ["❤️", "👍", "😂", "🥺", "😮", "😢", "🔥", "✨"];

export function sameReactionActor(a: MessageReactionActor, b: MessageReactionActor): boolean {
    return a.kind === b.kind && a.id === b.id;
}

/** One reaction per actor; choosing it again removes it. Other actors are preserved. */
export function toggleMessageReaction(
    reactions: MessageReaction[] | undefined,
    actor: MessageReactionActor,
    emoji: string,
    createdAt = new Date().toISOString(),
): MessageReaction[] {
    const previous = reactions || [];
    const selected = previous.find(reaction => sameReactionActor(reaction.actor, actor));
    const next = previous.filter(reaction => !sameReactionActor(reaction.actor, actor));
    if (emoji && selected?.emoji !== emoji) next.push({ actor, emoji, createdAt });
    return next;
}

/** Preserve annotations on surviving bubbles when the existing reply editor rebuilds IDs. */
export function preserveMessageAnnotations(previous: ChatMessage[], next: ChatMessage[]): ChatMessage[] {
    const used = new Set<string>();
    return next.map((message, index) => {
        const match = previous.find(old => !used.has(old.id)
            && old.content === message.content && old.mediaType === message.mediaType
            && old.senderCharacterId === message.senderCharacterId);
        const source = match || (previous.length === next.length && !used.has(previous[index].id)
            && previous[index].senderCharacterId === message.senderCharacterId ? previous[index] : undefined);
        if (!source) return message;
        used.add(source.id);
        return { ...message, reactions: source.reactions, favoritedAt: source.favoritedAt };
    });
}
