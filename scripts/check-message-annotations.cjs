const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
const persisted=new Map(); const kv=new Map();
function load() {
 const cache={};
 const db={initChatDb:async()=>({messages:[...persisted.values()].map(x=>JSON.parse(JSON.stringify(x))),sessions:[],contacts:[]}),dbPutMessage:m=>persisted.set(m.id,structuredClone(m)),dbPutMessages:ms=>ms.forEach(m=>persisted.set(m.id,structuredClone(m))),dbDeleteMessage:id=>persisted.delete(id),dbDeleteMessagesByIds:ids=>ids.forEach(id=>persisted.delete(id))};
 const mocks={ './chat-db':new Proxy(db,{get:(o,k)=>o[k]||(()=>{})}), './settings-storage':{resolveUserIdentity:()=>null}, './character-storage':{loadCharacters:()=>[],saveCharacters:()=>{}}, './kv-db':{kvGet:k=>kv.get(k),kvSet:(k,v)=>kv.set(k,v),registerKvMigration:()=>{}}, './chat-plugin-hooks':{emitChatPluginEvent:()=>{},runChatPluginTransformSync:(_,v)=>v}, './rich-message-parser':{parseAIResponse:()=>({parts:[]})}, './text-tool-protocol':{extractTextToolDirectiveText:()=>''}, './chat-avatar-intent':{findUserAvatarChangeIntent:()=>null,inferAvatarDecisionFromReply:()=>null} };
 function requireSource(name) {
  if(mocks[name])return mocks[name];if(cache[name])return cache[name].exports;
  const module={exports:{}};cache[name]=module;
  const code=ts.transpileModule(fs.readFileSync('lib/'+name.replace('./','')+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require:requireSource,console,Date,Math,Set,Map,window:{dispatchEvent:()=>{},localStorage:{getItem:()=>null}},CustomEvent:class{},setTimeout});return module.exports;
 }
 return requireSource('./chat-storage');
}
(async()=>{
 let store=load();await store.hydrateChatStorage();
 const old=store.pushChatMessage({sessionId:'one',role:'user',content:'old',createdAt:'2026-10-01T00:00:00Z'});
 const recent=store.pushChatMessage({sessionId:'one',role:'assistant',content:'recent',createdAt:'2026-10-02T00:00:00Z',responseBatchId:'batch',rawResponseText:'recent'});
 const other=store.pushChatMessage({sessionId:'two',role:'user',content:'other'});
 store.toggleChatMessageFavorite(recent.id);store.toggleChatMessageFavorite(old.id);store.toggleChatMessageFavorite(other.id);
 assert.deepEqual(Array.from(store.loadChatFavorites('one'),m=>m.id),[recent.id,old.id]);
 store.reactToChatMessage(recent.id,{kind:'character',id:'peter'},'👍');store.reactToChatMessage(recent.id,{kind:'user',id:'local'},'❤️');store.reactToChatMessage(recent.id,{kind:'user',id:'local'},'😂');
 assert.equal(store.loadChatMessages('one')[1].reactions.length,2);
 store=load();await store.hydrateChatStorage();assert.equal(store.loadChatFavorites('one').length,2);assert.equal(store.loadChatMessages('one')[1].reactions[1].emoji,'😂');
 store.reactToChatMessage(recent.id,{kind:'user',id:'local'},'😂');assert.equal(store.loadChatMessages('one')[1].reactions.length,1);
 const replaced=store.replaceResponseBatchWithParts('one','batch','edited',[{content:'edited'}]);assert.ok(replaced[0].favoritedAt);assert.equal(replaced[0].reactions[0].actor.id,'peter');assert.equal(replaced[0].responseBatchId,'batch');
 store.toggleChatMessageFavorite(old.id);assert.equal(store.loadChatFavorites('one').length,1);
 assert.equal(store.loadChatMessages('one').length,2);assert.equal(store.loadChatMessages('two').length,1);
 console.log('PASS: favorite toggle/session isolation/time order; multi-actor reaction add/switch/remove; persistence rehydration; reply-edit metadata preservation. (Persistence adapter mocked.)');
})().catch(e=>{console.error(e);process.exit(1)});

const room=fs.readFileSync('components/chat/chat-room.tsx','utf8');
const menu=room.slice(room.indexOf('const renderBubbleContextMenu'),room.indexOf('const renderDeleteOnlyContextMenu'));
const labels=Array.from(menu.slice(menu.indexOf('<span>Copy</span>')).matchAll(/<span>(Copy|Edit|Quote|React|Select|Favorite|Delete|Regenerate)<\/span>/g),match=>match[1]);
assert.deepEqual(labels,['Copy','Edit','Quote','React','Select','Favorite','Delete','Regenerate']);
assert.ok(!menu.includes('handleRetry('));
assert.ok(!room.includes('>重试以下<') && !room.includes('>删除以下<'));
console.log('PASS: eight native actions in requested order; no Below entries; Regenerate never invokes destructive retry.');
