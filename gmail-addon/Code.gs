/**
 * Faro in the Gmail sidebar.
 *
 * Asks nothing when it can: it knows you from your email domain (matched to your company's
 * website in Cala). A personal address (gmail.com…) can't say which startup is yours, so then,
 * and only then, it asks for the startup's name once, as the web does.
 *
 *  - Homepage: your log. The first look is three doors of different partnership types.
 *  - An open message: if the sender's company is one of your doors, that door, in five parts.
 *  - "more like this · not now" taps are kept in your user properties and weight future doors.
 *
 * Script properties:
 *   FARO_URL          where Faro is deployed, e.g. https://faro-xyz.vercel.app (required)
 *   FARO_TEST_SENDER  test only: pretend every open message comes from this address
 */

var LOGO = 'https://raw.githubusercontent.com/yosephbenjamin/farooo/main/gmail-addon/lighthouse.png';

// ---------- settings ----------
function base_() {
  var u = PropertiesService.getScriptProperties().getProperty('FARO_URL') || '';
  return u.replace(/\/+$/, '');
}
function user_() {
  return PropertiesService.getUserProperties();
}
function startup_() {
  return user_().getProperty('FARO_STARTUP') || '';
}
function slugKey_(s) {
  return 'FARO_TAPS_' + String(s || 'me').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
}
function taps_(slug) {
  return user_().getProperty(slugKey_(slug)) || '';
}

// ---------- the API ----------
function call_(params) {
  var q = Object.keys(params)
    .filter(function (k) { return params[k]; })
    .map(function (k) { return k + '=' + encodeURIComponent(params[k]); })
    .join('&');
  try {
    var res = UrlFetchApp.fetch(base_() + '/api/gmail?' + q, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { Accept: 'application/json' },
    });
    var text = res.getContentText() || '';
    var body = {};
    try { body = JSON.parse(text); } catch (err) { body = { error: 'Faro answered something other than JSON (HTTP ' + res.getResponseCode() + '). Check FARO_URL.' }; }
    return { code: res.getResponseCode(), body: body };
  } catch (err) {
    return { code: 0, body: { error: 'The lighthouse is out of reach: ' + String(err).slice(0, 120) } };
  }
}

function ask_(extra) {
  var p = { user: Session.getActiveUser().getEmail(), startup: startup_() };
  for (var k in extra) p[k] = extra[k];
  return p;
}

// ---------- cards ----------
function esc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function header_(title) {
  return CardService.newCardHeader().setTitle(title || 'Faro').setImageUrl(LOGO).setImageStyle(CardService.ImageStyle.SQUARE);
}
function note_(text) {
  return CardService.newCardBuilder().setHeader(header_())
    .addSection(CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(esc_(text))))
    .build();
}

/** Asked once, only when the email domain can't say which startup is yours. */
function nameCard_(reason) {
  var s = CardService.newCardSection();
  if (reason) s.addWidget(CardService.newTextParagraph().setText('<i>' + esc_(reason) + '</i>'));
  s.addWidget(CardService.newTextInput().setFieldName('startup').setTitle('Which startup are you?').setValue(startup_()));
  s.addWidget(CardService.newTextButton().setText('Show my doors')
    .setOnClickAction(CardService.newAction().setFunctionName('onSetStartup')));
  return CardService.newCardBuilder().setHeader(header_()).addSection(s).build();
}

/** The five parts: why now, why you, where to meet, warm path, who. */
function doorSection_(d, slug) {
  var s = CardService.newCardSection();
  s.addWidget(CardService.newDecoratedText().setText('<b>' + esc_(d.lead) + '</b>').setWrapText(true)
    .setBottomLabel(esc_(d.footnote)).setOpenLink(CardService.newOpenLink().setUrl(d.source)));
  s.addWidget(CardService.newTextParagraph().setText(esc_(d.why) + (d.note ? ' †' : '')));
  var meta = (d.meta || []).concat(d.people ? [d.people] : []).join('. ');
  if (meta) s.addWidget(CardService.newTextParagraph().setText('<i>' + esc_(meta) + '.</i>'));
  if (!d.people) {
    s.addWidget(CardService.newTextButton().setText('Find the right person →')
      .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
      .setOpenLink(CardService.newOpenLink().setUrl(d.xray)));
  }
  if (d.note) s.addWidget(CardService.newTextParagraph().setText('<font color="#9a9488">† ' + esc_(d.note) + '</font>'));
  var type = d.type || (d.types || [])[0] || 'customer';
  s.addWidget(CardService.newButtonSet()
    .addButton(CardService.newTextButton().setText('more like this').setTextButtonStyle(CardService.TextButtonStyle.TEXT)
      .setOnClickAction(CardService.newAction().setFunctionName('onTap').setParameters({ kind: 'more', type: type, id: d.id, slug: slug || '' })))
    .addButton(CardService.newTextButton().setText('not now').setTextButtonStyle(CardService.TextButtonStyle.TEXT)
      .setOnClickAction(CardService.newAction().setFunctionName('onTap').setParameters({ kind: 'notnow', type: type, id: d.id, slug: slug || '' }))));
  return s;
}

function footer_(card, slug) {
  var s = CardService.newCardSection();
  if (slug) s.addWidget(CardService.newTextButton().setText('Read the full log →').setTextButtonStyle(CardService.TextButtonStyle.TEXT)
    .setOpenLink(CardService.newOpenLink().setUrl(base_() + '/for/' + encodeURIComponent(slug))));
  if (startup_()) s.addWidget(CardService.newTextButton().setText('Not your startup? Change it').setTextButtonStyle(CardService.TextButtonStyle.TEXT)
    .setOnClickAction(CardService.newAction().setFunctionName('onChangeStartup')));
  card.addSection(s);
}

function logCard_(body) {
  var card = CardService.newCardBuilder().setHeader(header_());
  card.addSection(CardService.newCardSection().addWidget(CardService.newTextParagraph().setText('<b>' + esc_(body.headline) + '</b>')));
  (body.doors || []).forEach(function (d) { card.addSection(doorSection_(d, body.slug)); });
  footer_(card, body.slug);
  return card.build();
}

// ---------- triggers ----------
/**
 * Every trigger asks quickly first (stored data only, instant). A startup Faro must look up live
 * in Cala comes back { pending }, and we show a static "Looking for X…" card: Google's cards can't
 * show anything while a request runs. Its button runs the full lookup under Gmail's progress bar.
 */
function onHomepage() {
  if (!base_()) return note_('Set FARO_URL in Project Settings → Script properties.');
  return answer_(call_(ask_({ quick: '1' })), {}, true);
}

function onGmailMessage(e) {
  if (!base_()) return note_('Set FARO_URL in Project Settings → Script properties.');
  var sender = PropertiesService.getScriptProperties().getProperty('FARO_TEST_SENDER') || senderOf_(e);
  if (!sender) return onHomepage();
  return answer_(call_(ask_({ sender: sender, quick: '1' })), { sender: sender }, true);
}

/** The "Show my doors" button on the Looking card: the full (live) lookup. */
function onLook(e) {
  var p = e.parameters || {};
  var card = answer_(call_(ask_({ sender: p.sender || '' })), {}, false);
  return CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().updateCard(card)).build();
}

/** Turn an API answer into a card. */
function answer_(r, extra, quick) {
  if (r.body.needsName) return nameCard_(r.body.reason);
  if (r.body.pending) return lookingCard_(r.body.name, extra);
  if (r.code !== 200 || r.body.error) return note_(r.body.error || 'The lighthouse is out of reach.');
  if (r.body.match) {
    var card = CardService.newCardBuilder().setHeader(header_('One of your doors'));
    card.addSection(doorSection_(r.body.door, r.body.slug));
    footer_(card, r.body.slug);
    return card.build();
  }
  // the log, re-ranked by this startup's taps when there are any
  var taps = taps_(r.body.slug);
  if (taps) {
    var params = { taps: taps };
    if (quick) params.quick = '1';
    var t = call_(ask_(params));
    if (t.code === 200 && !t.body.error && !t.body.pending && !t.body.needsName) return logCard_(t.body);
  }
  return logCard_(r.body);
}

/** A static lighthouse while Faro reads Cala (Gmail's cards can't animate). */
function lookingCard_(name, extra) {
  var s = CardService.newCardSection();
  s.addWidget(CardService.newImage().setImageUrl(LOGO).setAltText('A hand-drawn lighthouse'));
  s.addWidget(CardService.newTextParagraph().setText('<b>Looking for ' + esc_(name || 'your startup') + '…</b>'));
  s.addWidget(CardService.newTextParagraph().setText('<i>Reading the funding records. Checking who backed whom. Looking for doors. A new name can take half a minute.</i>'));
  s.addWidget(CardService.newTextButton().setText('Show my doors')
    .setOnClickAction(CardService.newAction().setFunctionName('onLook').setParameters({ sender: (extra && extra.sender) || '' })));
  var card = CardService.newCardBuilder().setHeader(header_()).addSection(s);
  if (startup_()) footer_(card, '');
  return card.build();
}

function senderOf_(e) {
  try {
    GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
    var from = GmailApp.getMessageById(e.gmail.messageId).getFrom();
    var m = from.match(/<([^>]+)>/);
    return (m ? m[1] : from).trim();
  } catch (err) {
    return '';
  }
}

// ---------- actions ----------
function onSetStartup(e) {
  var name = (e.formInput && e.formInput.startup ? String(e.formInput.startup) : '').trim();
  if (name) user_().setProperty('FARO_STARTUP', name.slice(0, 120));
  else user_().deleteProperty('FARO_STARTUP');
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(onHomepage())).build();
}

function onChangeStartup() {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(nameCard_(''))).build();
}

/** Universal action (the ⋮ menu): ask for the startup's name again. */
function onUniversalChange() {
  return CardService.newUniversalActionResponseBuilder().displayAddOnCards([nameCard_('')]).build();
}

/** Same shape as the web's taps cookie (src/lib/taps.ts), kept per startup. */
function onTap(e) {
  var p = e.parameters;
  var key = slugKey_(p.slug);
  var raw = user_().getProperty(key);
  var t = { weights: {}, hidden: [], touched: false };
  try { if (raw) t = JSON.parse(decodeURIComponent(raw)); } catch (err) {}
  t.weights = t.weights || {};
  t.hidden = t.hidden || [];
  t.weights[p.type] = (t.weights[p.type] || 0) + (p.kind === 'more' ? 1 : -1);
  if (p.kind === 'notnow') t.hidden.push(p.id);
  t.hidden = t.hidden.slice(-100);
  t.touched = true;
  user_().setProperty(key, encodeURIComponent(JSON.stringify(t)));
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(p.kind === 'more' ? 'More like this. Noted.' : 'Not now. Put away.'))
    .setNavigation(CardService.newNavigation().updateCard(onHomepage())).build();
}
