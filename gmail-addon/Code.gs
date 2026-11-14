/**
 * Faro in the Gmail sidebar. No questions: it knows you from your email domain.
 * - Homepage: your log (the first look is three doors of different partnership types).
 * - An open message: if the sender's company is one of your doors, that door, in five parts.
 * "more like this · not now" taps are kept in your user properties and weight future doors.
 *
 * Script property: FARO_URL (where Faro is deployed).
 */
function base_() {
  return PropertiesService.getScriptProperties().getProperty('FARO_URL');
}
function taps_() {
  return PropertiesService.getUserProperties().getProperty('FARO_TAPS') || '';
}
function call_(params) {
  var q = Object.keys(params).filter(function (k) { return params[k]; })
    .map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
  var res = UrlFetchApp.fetch(base_() + '/api/gmail?' + q, { muteHttpExceptions: true });
  return { code: res.getResponseCode(), body: JSON.parse(res.getContentText() || '{}') };
}
function note_(text) {
  return CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle('Faro'))
    .addSection(CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(text))).build();
}

function onHomepage() {
  if (!base_()) return note_('Set FARO_URL in the script properties.');
  var r = call_({ user: Session.getActiveUser().getEmail(), taps: taps_() });
  if (r.code !== 200) return note_(r.body.error || 'The lighthouse is out of reach.');
  var card = CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle('Faro'));
  card.addSection(CardService.newCardSection().addWidget(CardService.newTextParagraph().setText('<b>' + r.body.headline + '</b>')));
  (r.body.doors || []).forEach(function (d) { card.addSection(doorSection_(d)); });
  return card.build();
}

function onGmailMessage(e) {
  if (!base_()) return note_('Set FARO_URL in the script properties.');
  var accessToken = e.gmail.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);
  var msg = GmailApp.getMessageById(e.gmail.messageId);
  var from = msg.getFrom();
  var m = from.match(/<([^>]+)>/);
  var sender = m ? m[1] : from;
  var r = call_({ user: Session.getActiveUser().getEmail(), sender: sender, taps: taps_() });
  if (r.code !== 200) return note_(r.body.error || 'The lighthouse is out of reach.');
  if (!r.body.match) return onHomepage();
  var card = CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle('A door, in your inbox'));
  card.addSection(doorSection_(r.body.door));
  return card.build();
}

/** The five parts: why now, why you, where to meet, warm path, who. */
function doorSection_(d) {
  var s = CardService.newCardSection();
  s.addWidget(CardService.newDecoratedText().setText('<b>' + d.lead + '</b>').setWrapText(true)
    .setBottomLabel(d.footnote).setOpenLink(CardService.newOpenLink().setUrl(d.source)));
  s.addWidget(CardService.newTextParagraph().setText(d.why));
  var meta = (d.meta || []).concat(d.people ? [d.people] : []).join('. ');
  if (meta) s.addWidget(CardService.newTextParagraph().setText('<i>' + meta + '</i>'));
  if (!d.people) s.addWidget(CardService.newTextButton().setText('Find the right person →')
    .setOpenLink(CardService.newOpenLink().setUrl(d.xray)).setTextButtonStyle(CardService.TextButtonStyle.TEXT));
  var type = (d.types || [])[0] || 'customer';
  s.addWidget(CardService.newButtonSet()
    .addButton(CardService.newTextButton().setText('more like this').setTextButtonStyle(CardService.TextButtonStyle.TEXT)
      .setOnClickAction(CardService.newAction().setFunctionName('onTap').setParameters({ kind: 'more', type: type, id: d.id })))
    .addButton(CardService.newTextButton().setText('not now').setTextButtonStyle(CardService.TextButtonStyle.TEXT)
      .setOnClickAction(CardService.newAction().setFunctionName('onTap').setParameters({ kind: 'notnow', type: type, id: d.id }))));
  return s;
}

/** Same shape as the web's taps cookie (src/lib/taps.ts). */
function onTap(e) {
  var p = e.parameters;
  var raw = taps_();
  var t = raw ? JSON.parse(decodeURIComponent(raw)) : { weights: {}, hidden: [], touched: false };
  t.weights[p.type] = (t.weights[p.type] || 0) + (p.kind === 'more' ? 1 : -1);
  if (p.kind === 'notnow') t.hidden.push(p.id);
  t.touched = true;
  PropertiesService.getUserProperties().setProperty('FARO_TAPS', encodeURIComponent(JSON.stringify(t)));
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(p.kind === 'more' ? 'More like this.' : 'Not now.'))
    .setNavigation(CardService.newNavigation().updateCard(onHomepage())).build();
}
