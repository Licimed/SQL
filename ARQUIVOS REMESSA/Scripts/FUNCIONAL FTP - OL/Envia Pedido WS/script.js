var data = toJson(getCampoArquivo("json"));

log("Inicio WholeSaler Resposta Pedido Pos " + JSON.stringify(data.data));
log("Dados: "+JSON.stringify(data.data.createResponse));



log("Fim WholeSaler Resposta Pedido Pos");


/*var data = toJson(getCampoArquivo("json"));

log("Inicio WholeSaler Resposta Pedido Pos " + JSON.stringify(data.data));
log("Dados: "+JSON.stringify(data.data.createResponse));

if(data.data.createResponse){
    var notas = encontrarRegistros("CabecalhoNota","CODTIPOPER IN(234) AND ISNULL( AD_STATUSOL, 'N' ) = 'WS' AND AD_ORDER_CODE = "+data.data.createResponse.order_code+" AND nullValue(AD_IMPFIDELIZE,'N') = 'S' AND PENDENTE = 'N' AND AD_STATUSFIDELIZE NOT IN ('AWAITING_INVOICE','S','INVOICE_RECEIVED','REJECTED','N','AWAITING_PROCESSING','PROCESSED','CANCELLED','AWAITING_CANCELLATION') AND NUNOTA = "+data.data.createResponse.wholesaler_order_code+" ");
    notas.forEach(function(linha){
        linha.setCampo("AD_STATUSFIDELIZE", "AWAITING_PROCESSING");
        var ind = encontrarRegistro("AD_APIFIDIND", "CODIND ='"+notas[0].getCampo("AD_CODINDFIDEL")+"' ");
        ind.setCampo("DTATUALIZACAOSAIDA", new java.util.Date().toLocaleString() );
        ind.save();
        linha.save();
    });
}
log("Fim WholeSaler Resposta Pedido Pos");*/