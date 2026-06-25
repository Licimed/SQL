var data = toJson(getCampoArquivo("json"));

log("Inicio Canal Autorizador Resposta Nota Pos " + JSON.stringify(data.data));
log("Dados: "+JSON.stringify(data.data.createGroupedInvoice));

var data = toJson(getCampoArquivo("json"));

var orderCode = String(data.data.createGroupedInvoice.grouped_order_code);
if(orderCode !== null) {
    var codParc = data.data.createGroupedInvoice.client_code;
    var status = data.data.createGroupedInvoice.status;

    if(data.data.createGroupedInvoice){
        var notas = encontrarRegistros("CabecalhoNota","TIPMOV = 'V' AND EXISTS (SELECT * FROM TGFITE WHERE NUNOTA = TGFCAB.NUNOTA AND AD_NROPEDOL = " + orderCode + ")");

        notas.forEach(function(nota) {
            nota.setCampo("AD_STATUSOL", status);
            nota.save();
        });
    }
}
log("Fim Canal Autorizador Resposta Nota Pos");