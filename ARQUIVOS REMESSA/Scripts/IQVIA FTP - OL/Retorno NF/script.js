log("Aqui se iniciou o Pós Processamento arquivo NF IQVIA OL.");

function Nota() {
	if (getCampoArquivo("RS_NUNOTA")) {

		var nota = encontrarRegistro('CabecalhoNota', "NUNOTA =  " + getCampoArquivo("RS_NUNOTA"));

		if (nota) {
		    nota.setCampo("AD_STATUSOL", "E");
            nota.save();
		} else 
			mostraErro("Nota nao encontrada");
	} else
		mostraErro("Nota nao definida");

}

switch (String(getCampoArquivo('RS_REG'))) {
	case '1': Nota(); break;
	default: mostraErro('Linha nao configurada ' + getCampoArquivo('RS_REG'));
}

log('Fim do processamento');