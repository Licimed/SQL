log("*POS-*PHA*OUT* Aqui se iniciou o PÓS Processamento arquivo RETORNO.");

	function Pedido() {
		if (getCampoArquivo("RS_NUNOTA")) {

			var nota = encontrarRegistro('CabecalhoNota', "NUNOTA =  " + getCampoArquivo("RS_NUNOTA"));

			if (nota) {
				nota.setCampo("AD_STATUSOL", "PedEnviado");
				nota.setCampo("AD_DTRETOL", new java.util.Date().toLocaleString());
				nota.save();
				/*
				var ind = encontrarRegistro("AD_APIFIDIND", "CODIND = 'SDZ' ");
				ind.setCampo("DTATUALIZACAOSAIDA", new java.util.Date().toLocaleString() );
				ind.save();
				*/
			}else{
				mostraErro("Pedido Não encontrada");
			}
		}else{
			mostraErro("Pedido Não definido")
		}

	}

	switch (String(getCampoArquivo('RS_REG') ) ) {
		case '01': Pedido(); break;
		default: mostraErro('Linha não configurada ' + getCampoArquivo('RS_REG'));
	}
	
	
	log('Fim do processamento');