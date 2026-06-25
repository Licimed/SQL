log("Iniciou o Pós Processamento Job Cancelamento");

function Nota() {
    if (getCampoArquivo("RS_NUNOTA")) {

        var nota = encontrarRegistro('AD_TGFCAN', "NUNOTA =  " + getCampoArquivo("RS_NUNOTA"));
        log("Nota NrUnico = "+ getCampoArquivo("RS_NUNOTA"));

        if (nota) {
            nota.setCampo("STATUSINTEGRACAO", "E");
            nota.save();
        }else{
            mostraErro("Nota Não encontrada")
        }
    }else{
        mostraErro("Nota Não definida")
    }

}

switch (String(getCampoArquivo('RS_REG'))) {
    case '1': Nota(); break;
    default: mostraErro('Linha não configurada ' + getCampoArquivo('RS_REG'));
}
log('Fim do processamento');