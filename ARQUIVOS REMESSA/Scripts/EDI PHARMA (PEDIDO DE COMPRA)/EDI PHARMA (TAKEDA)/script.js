//Envio Pedido de Compra
log("Iniciou o pos processamento Job Pedido de compra Matriz RS - EDI Pharma Takeda");

function Pedido() {
    if (getCampoArquivo("RS_NUNOTA")) {

        var pedido = encontrarRegistro('CabecalhoNota', "NUNOTA =  " + getCampoArquivo("RS_NUNOTA"));
        log("Pedido de compra Novartis NrUnico = "+ getCampoArquivo("RS_NUNOTA"));

        if (pedido) {
            pedido.setCampo("AD_STATUSINTEGEDIPHARMA", "1");
            pedido.save();
            log("Pedido de compra Matriz RS - Takeda NrUnico = "+ getCampoArquivo("RS_NUNOTA")+" enviado com sucesso");
        }else{
            mostraErro("Pedido Não encontrado - Matriz RS - Novartis NrUnico = "+ getCampoArquivo("RS_NUNOTA"))
        }
    }else{
        mostraErro("Pedido Não definido")
    }

}
switch (String(getCampoArquivo('RS_TIPOREGISTRO') ) ) {
    case '00': Pedido(); break;
    default: mostraErro('Linha não configurada ' + getCampoArquivo('RS_TIPOREGISTRO'));
}

log("Concluiu envio de pedido de compra da Matriz ES para Novartis - Nr. Único: "+getCampoArquivo("RS_NUNOTA"));