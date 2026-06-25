log("Aqui se iniciou o PÓS Processamento arquivo RETORNO IQVIA OL.");

function Pedido() {
	if (getCampoArquivo("RS_NUNOTA")) {

		var nota = encontrarRegistro('CabecalhoNota', "NUNOTA =  " + getCampoArquivo("RS_NUNOTA"));

		if (nota) {
		    var itemCortado = encontrarRegistro('ItemNota', "NUNOTA =  " + getCampoArquivo("RS_NUNOTA")+" AND QTDCONFERIDA > 0 AND ROWNUM = 1");

			if (!itemCortado)
		        nota.setCampo("AD_STATUSOL", "A");
		    else
		        nota.setCampo("AD_STATUSOL", "P");
		        
			nota.save();
		} else
			mostraErro("Pedido Não encontrada");
	} else
		mostraErro("Pedido Não definido")

}

switch (String(getCampoArquivo('RS_REG') ) ) {
	case '1': Pedido(); break;
	default: mostraErro('Linha não configurada ' + getCampoArquivo('RS_REG'));
}


log('Fim do processamento');