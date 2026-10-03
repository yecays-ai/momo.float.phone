"use client";

import type { ChatMessage } from "@/lib/chat-storage";
import { LOCAL_REACTION_ACTOR, sameReactionActor } from "@/lib/message-annotations";

export function MessageAnnotations({ message, onReact }: {
    message: ChatMessage;
    onReact?: (emoji: string) => void;
}) {
    if (!message.reactions?.length && !message.favoritedAt) return null;
    return (
        <div className="chat-message-annotations" aria-label="Message reactions and favorite">
            {message.reactions?.map(reaction => {
                const own = sameReactionActor(reaction.actor, LOCAL_REACTION_ACTOR);
                const label = `${own ? "Your" : "Character"} reaction: ${reaction.emoji}`;
                return onReact && own ? (
                    <button key={`${reaction.actor.kind}:${reaction.actor.id}`} type="button"
                        className="chat-message-reaction" aria-label={`Remove ${label}`} aria-pressed="true"
                        onPointerDown={event => event.stopPropagation()}
                        onClick={event => { event.stopPropagation(); onReact(reaction.emoji); }}>
                        {reaction.emoji}
                    </button>
                ) : (
                    <span key={`${reaction.actor.kind}:${reaction.actor.id}`} className="chat-message-reaction" aria-label={label}>
                        {reaction.emoji}
                    </span>
                );
            })}
            {message.favoritedAt && <span className="chat-message-favorite" aria-label="Favorited" title="Favorited">☆</span>}
        </div>
    );
}
