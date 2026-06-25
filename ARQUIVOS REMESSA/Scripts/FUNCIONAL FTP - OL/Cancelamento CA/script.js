var data = toJson(getCampoArquivo("json"));
var groupedOrder = data.data.setOrderAsImported;
log("Pos processamento createGroupedCancellation "+JSON.stringify(data.data));
var reg = encontrarRegistro('CabecalhoNota','NUNOTA = (SELECT NUNOTA FROM TGFITE WHERE AD_NROPEDOL = ' + groupedOrder.order_code + ") AND AD_NUINTEGRACAO = 2");
reg.setCampo("AD_STATUSOL",groupedOrder.status);
reg.save();