var data = toJson(getCampoArquivo("json"));

log("Inicio Canal Autorizador Resposta Pedido Pos " + JSON.stringify(data.data));
log("Dados: "+JSON.stringify(data.data.createGroupedOrder));

var data = toJson(getCampoArquivo("json"));

log("NUNOTA: " + getCampoArquivo("RS_NUNOTA"));

var orderCode = String(data.data.createGroupedOrder.id);

if(orderCode !== null) {
    var status = data.data.createGroupedOrder.status;
    var codParc = data.data.createGroupedOrder.client_code;
    
    if(data.data.createGroupedOrder){
        var pedidos = encontrarRegistros("CabecalhoNota","EXISTS (SELECT * FROM TGFITE ITE INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD) WHERE PRO.MARCA = 'SANOFI' AND ITE.NUNOTA = TGFCAB.NUNOTA) " +
            "AND AD_STATUSOL IS NULL AND TRUNC(DTNEG) = TRUNC(SYSDATE) AND TIPMOV = 'P' AND CODPARC = " + codParc);
        var itens;    
            
        pedidos.forEach(function(pedido) {
            pedido.setCampo("AD_STATUSOL", status);
            pedido.save();
            
            itens = encontrarRegistros("ItemNota", "NUNOTA = " + pedido.getCampo("NUNOTA"));
            
            itens.forEach(function(item) {
                if(item.getCampo("MARCA").equals('SANOFI')) {
                    item.setCampo("AD_NROPEDOL", orderCode);
                    item.save();
                }
            });
        });
    }
}
log("Fim Canal Autorizador Resposta Pedido Pos");