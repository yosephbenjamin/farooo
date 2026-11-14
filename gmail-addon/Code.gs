/**
 * Faro in the Gmail sidebar: the same log, as a card.
 * Set FARO_URL (where the app runs) and STARTUP under Project Settings > Script properties.
 */
function onHomepage() {
  var props = PropertiesService.getScriptProperties();
  var base = props.getProperty('FARO_URL');
  var startup = props.getProperty('STARTUP') || 'oura';
  var card = CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle('Faro'));
  if (!base) {
    card.addSection(CardService.newCardSection().addWidget(
      CardService.newTextParagraph().setText('Set FARO_URL in the script properties.')));
    return card.build();
  }
  var res = UrlFetchApp.fetch(base + '/api/doors/' + encodeURIComponent(startup), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    card.addSection(CardService.newCardSection().addWidget(
      CardService.newTextParagraph().setText('The lighthouse is out of reach.')));
    return card.build();
  }
  var log = JSON.parse(res.getContentText());
  card.addSection(CardService.newCardSection().addWidget(
    CardService.newTextParagraph().setText('<b>' + log.headline + '</b>')));
  var doors = CardService.newCardSection();
  log.doors.forEach(function (d) {
    doors.addWidget(CardService.newDecoratedText()
      .setText(d.lead)
      .setBottomLabel(d.why)
      .setWrapText(true)
      .setOpenLink(CardService.newOpenLink().setUrl(d.source.url))
      .setTopLabel(d.date + ' · ' + d.source.name));
  });
  card.addSection(doors);
  if (log.doorCount) {
    card.addSection(CardService.newCardSection().addWidget(
      CardService.newTextParagraph().setText('<font color="#8f8178">Doors per investor: ' + log.doorCount + '</font>')));
  }
  return card.build();
}
