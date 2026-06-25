log("*POS-*TAK*OUT* Aqui se iniciou o Pós Processamento arquivo NF RESSARCIMENTO .");

	function Nota() {
		if (getCampoArquivo("RS_NUNOTA")) {

			var nota = encontrarRegistro('CabecalhoNota', "NUNOTA =  " + getCampoArquivo("RS_NUNOTA"));

			if (nota) {
				nota.setCampo("AD_STATUSOL", "NFeEnviadaRESSARC");
				nota.setCampo("AD_DTNFRESSARCOL", new java.util.Date().toLocaleString());
				nota.save();
				/*
				var ind = encontrarRegistro("AD_APIFIDIND", "CODIND = 'SDZ' ");
				ind.setCampo("DTATUALIZACAOSAIDA", new java.util.Date().toLocaleString() );
				ind.save();
				*/
			}else{
				mostraErro("Nota nao encontrada");
			}
		}else{
			mostraErro("Nota nao definida");
		}

	}

	switch (String(getCampoArquivo('RS_REG'))) {
		case '1': Nota(); break;
		default: mostraErro('Linha nao configurada ' + getCampoArquivo('RS_REG'));
	}

log('Fim do processamento');