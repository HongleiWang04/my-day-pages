import {AI_TEXT_LIMIT, eventCatalog, normalizeDraft} from './ai-record-core.js?v=20261118-ai-record-1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function createAIRecorder({sheet, showSheet, getEvents, getDate, openRecord}) {
  let remembered = '', active = null;
  const endpoint = () => {
    const meta = document.querySelector('meta[name="my-day-ai-endpoint"]');
    if (meta && !meta.content) return null;
    const url = new URL(meta?.content || './api/parse-record', location.href);
    if (url.origin !== location.origin && url.protocol !== 'https:') return null;
    return url.href;
  };
  function open() {
    active?.abort(); const lifecycle = new AbortController(); active = lifecycle;
    let extraction = null, requestInput = null, selectedId = '', ready = false, loading = false;
    const events = eventCatalog(getEvents()), address = endpoint();
    showSheet('一句话记录', `<div class="ai-intro"><span class="ai-label">AI · 随手记</span><h3>说一句，帮你整理好。</h3><p>写下刚刚发生的小事，核对后再保存。</p></div><label class="field-label" for="ai-record-text">想记下什么？</label><textarea id="ai-record-text" class="text-input ai-textarea" maxlength="${AI_TEXT_LIMIT}" placeholder="例如：昨晚健身40分钟">${esc(remembered)}</textarea><div class="ai-input-footer"><span>每次记录一件事</span><span id="ai-char-count">${remembered.length} / ${AI_TEXT_LIMIT}</span></div><div class="ai-examples">${['昨晚健身40分钟','今天游泳了','昨天下午3点打了网球'].map(text => `<button type="button" data-ai-example="${esc(text)}">${esc(text)}</button>`).join('')}</div><p class="ai-privacy">解析时仅发送这句话和事件名称、类型、单位，不发送历史记录与照片。</p><div class="ai-status" id="ai-record-status" role="status" aria-live="polite">${events.length ? '正在准备AI解析…' : '先添加一个事件，就能试试一句话记录。'}</div><button type="button" id="ai-record-generate" class="full-btn ai-primary" disabled>生成记录草稿</button><section id="ai-record-result" hidden></section><button type="button" id="ai-record-manual" class="ai-manual">手动选择事件</button><section id="ai-record-event-choice" hidden></section>`, null, {mode:'ai-record-sheet', dirty:()=>!!remembered.trim(), onClose:()=>lifecycle.abort()});
    const find = selector => sheet.querySelector(selector), input = find('#ai-record-text'), status = find('#ai-record-status'), generate = find('#ai-record-generate'), result = find('#ai-record-result');
    const alive = () => !lifecycle.signal.aborted && input.isConnected;
    const resetResult = () => { extraction = null; result.hidden = true; result.innerHTML = ''; sheet.classList.remove('ai-has-draft'); };
    const update = () => { remembered = input.value; find('#ai-char-count').textContent = remembered.length + ' / ' + AI_TEXT_LIMIT; generate.disabled = !ready || loading || !remembered.trim(); };
    input.addEventListener('input', () => { resetResult(); update(); });
    for (const button of sheet.querySelectorAll('[data-ai-example]')) button.onclick = () => { if (loading) return; input.value = button.dataset.aiExample; resetResult(); update(); input.focus(); };
    function choose(manual = false) {
      const holder = manual ? find('#ai-record-event-choice') : result;
      holder.hidden = false;
      if (!events.length) { holder.innerHTML = '<p class="ai-notice">还没有可记录的事件。</p><button class="full-btn ai-primary" data-action="new-event">添加事件</button>'; return; }
      holder.innerHTML = `<label class="field-label" for="ai-event-select">${manual ? '选择事件，继续手动填写' : '选择对应事件'}</label><select id="ai-event-select" class="text-input"><option value="">请选择事件</option>${events.map(event=>`<option value="${esc(event.id)}">${esc(event.name)} · ${event.type === 'count' ? '次数' : event.type === 'duration' ? '时长' : '数值'}</option>`).join('')}</select><button type="button" class="full-btn ai-primary ai-choice-next" disabled>继续填写</button>`;
      const select = holder.querySelector('select'), next = holder.querySelector('button');
      select.onchange = () => { selectedId = select.value; next.disabled = !selectedId; };
      next.onclick = () => {
        if (!selectedId) return;
        const currentEvents = eventCatalog(getEvents()); if (!currentEvents.some(event=>event.id===selectedId)) { status.textContent = '这个事件已发生变化，请关闭后重试。'; return; }
        const draft = manual ? {eventId:selectedId,date:getDate(),time:null,value:null,note:remembered,warnings:[]} : normalizeDraft(extraction, {...requestInput,events:currentEvents}, selectedId);
        lifecycle.abort(); openRecord(draft, remembered);
      };
    }
    function displayDraft(payload) {
      extraction = payload.extraction;
      // Validate again against the current catalog, not a stale response id.
      const draft = normalizeDraft(extraction, {...requestInput, events:eventCatalog(getEvents())});
      result.hidden = false;
      if (draft.intent !== 'record') {
        const messages = {plan:'这句话像是一项计划。这里先记录已经发生的事，换一句试试吧。',multiple:'一次先记录一件事、一次活动，分开说会更清楚。',unsupported:'还没有找到要记录的小事，试试写“今天做了什么”。'};
        result.innerHTML = `<p class="ai-notice">${messages[draft.intent]}</p>`; return;
      }
      sheet.classList.add('ai-has-draft');
      if (!draft.eventId) { choose(); return; }
      const event = events.find(event=>event.id===draft.eventId);
      const value = draft.value === null ? '待补充' : draft.value + (event?.unit||'');
      result.innerHTML = `<div class="ai-draft-card"><span class="ai-label">待确认的草稿</span><h4>${esc(draft.eventName)}</h4><dl><div><dt>日期</dt><dd>${esc(draft.date||'待选择')}</dd></div><div><dt>时间</dt><dd>${esc(draft.time||'待选择')}</dd></div><div><dt>${event?.type==='duration'?'时长':event?.type==='count'?'次数':'数值'}</dt><dd>${esc(value)}</dd></div></dl>${draft.note?`<p class="ai-draft-note">${esc(draft.note)}</p>`:''}</div><button type="button" id="ai-draft-edit" class="full-btn ai-primary">核对并保存</button><p class="ai-save-help">下一步可以修改日期、时间、数值与备注。</p>`;
      find('#ai-draft-edit').onclick = () => { lifecycle.abort(); openRecord(draft, remembered); };
    }
    find('#ai-record-manual').onclick = () => { if (!loading) { result.hidden = true; choose(true); } };
    generate.onclick = async () => {
      if (!ready || loading || !input.value.trim()) return;
      loading = true; input.readOnly = true; update(); generate.textContent = '正在整理…'; generate.setAttribute('aria-busy','true'); status.textContent = '正在把这句话整理成记录草稿…'; result.hidden = true; find('#ai-record-event-choice').hidden = true;
      requestInput = {text:input.value.trim(),reference_date:getDate(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Shanghai',events:eventCatalog(getEvents())};
      const controller = new AbortController(), timer = setTimeout(()=>controller.abort(),22000);
      lifecycle.signal.addEventListener('abort',()=>controller.abort(),{once:true});
      try {
        const response = await fetch(address, {method:'POST',headers:{'Content-Type':'application/json','X-MY-DAY-AI':'1'},credentials:'same-origin',body:JSON.stringify(requestInput),signal:controller.signal});
        let payload; try { payload = await response.json(); } catch { throw Error('AI解析暂时不可用，文字已保留，可以手动填写。'); }
        if (!response.ok) throw Error(payload.error || 'AI解析暂时不可用，请重试。');
        if (!alive()) return; displayDraft(payload); status.textContent = '草稿已整理好，确认保存后才会计入记录。';
      } catch (error) { if (alive()) status.textContent = controller.signal.aborted ? '解析有点慢，文字已保留，可以重试或手动填写。' : error.message; }
      finally { clearTimeout(timer); if (alive()) { loading=false; input.readOnly=false; generate.textContent='重新生成草稿';generate.removeAttribute('aria-busy');update(); } }
    };
    const prepare = async () => {
      if (!address || !events.length) { status.textContent = !events.length ? '先添加一个事件，就能试试一句话记录。' : 'AI解析待开通。你可以先手动选择事件，文字会带入备注。'; return; }
      const timer=setTimeout(()=>lifecycle.abort(),8000);
      try { const response=await fetch(address,{credentials:'same-origin',signal:lifecycle.signal});const body=await response.json();if(!alive())return;ready=response.ok&&body.ready===true;status.textContent=ready?'准备好了，写下今天的小事吧。':'AI解析待开通。你可以先手动选择事件，文字会带入备注。';update(); }
      catch { if(input.isConnected)status.textContent='暂时连不上AI解析，文字可以继续手动填写。'; }
      finally { clearTimeout(timer); }
    };
    prepare(); update();
  }
  return {open, clear:()=>{remembered='';}, dispose:()=>active?.abort()};
}
