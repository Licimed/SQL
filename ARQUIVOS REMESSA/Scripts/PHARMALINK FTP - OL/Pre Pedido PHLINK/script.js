var_BREAK =  false;
log("Aqui se iniciou o Pós Processamento Modelo na Recepcao do Pedido PharmaLink OL."); 


function dadosComprador() {
    log('Executando: dadosComprador');
    var_PARCEIRO = obterCliente(getCampoArquivo('CNPJ_COMPRADOR'));
    log('Executando: fim dadosComprador');
    log('Parceior: ' + var_PARCEIRO);
}

//Campos Excluir:
//AD_CNPJENTREGA
//AD_VERLAYOUT

function numerosPedido() {
    log('Executando: numerosPedido');

    var_NOTA = encontrarRegistro("CabecalhoNota", "AD_NROPEDOL = '" + getCampoArquivo('NROPEDPHARMA') + "' AND AD_NUINTEGRACAO = 4 AND TIPMOV = 'P'");

    if(!var_NOTA) {
        log("Importando Pedido: " + getCampoArquivo('NROPEDPHARMA'));

        var_EMPRESA = encontrarRegistro("Empresa", "CGC = '" + getCampoArquivo('CNPJ_DISTRIBVENDEDOR') + "' AND CODEMP <= 500");

        if(!var_EMPRESA)
            mostraErro("Empresa nao cadastrada para o CNPJ " + getCampoArquivo('CNPJ_DISTRIBVENDEDOR'));

        var_CONFIG = encontrarRegistro('AD_PARCOL', "ID = 0");

        var_NOTA = cadastrarCabecalhoPedido(var_CONFIG, var_EMPRESA, var_PARCEIRO);
        var_NOTA.setCampo("AD_NROPEDOL", getCampoArquivo('NROPEDPHARMA'));
        var_NOTA.setCampo("AD_NUINTEGRACAO", 4);
        var_NOTA.setCampo("AD_STATUSOL", "Aceito");
        var_NOTA.setCampo("AD_DTIMPOL", new java.util.Date().toLocaleString() );
        var_NOTA.setCampo("AD_NROPEDCOMPRADOR", getCampoArquivo('NROPEDCLIENTE'));
        var_NOTA.save();
    }

    log('Executando: fim numerosPedido');
}

function formasPagamento(){
    //SEM IMPLEMENTAÇÃO ATÉ O MOMENTO
}

function dataPedido(){
    //SEM IMPLEMENTAÇÃO ATÉ O MOMENTO
}

function itemPedido(){
    log('itemPedido');
    var item = encontrarRegistro("ItemNota", "NUNOTA = " + var_NOTA.getCampo("NUNOTA") + " AND CODPROD IN ( SELECT CODPROD FROM TGFPRO WHERE REFERENCIA = '" + getCampoArquivo("EAN") + "' AND ATIVO = 'S')" );
    var produto;
    var configuracao;
    var top;

	if(!item){
        produto = encontrarRegistro('Produto',"REFERENCIA = '" + getCampoArquivo("EAN") + "' AND ATIVO = 'S'");
		log('pesquisa produto');

        if(produto){
            if(var_NOTA.getCampo("CODTIPOPER") == var_CONFIG.getCampo("CODTIPOPER")) {
                configuracao = encontrarRegistro("AD_PARCOL","CODMARCA = " + produto.getCampo("CODMARCA"));
                top = encontrarRegistro("TipoOperacao","CODTIPOPER = " + configuracao.getCampo("CODTIPOPER"));
                var_NOTA.setCampo("CODTIPOPER", top.getCampo("CODTIPOPER"));
                var_NOTA.setCampo("DHTIPOPER", top.getCampo("DHALTER"));
                var_NOTA.setCampo("AD_SIGLAOL", configuracao.getCampo("SIGLA"));
                var_NOTA.save();
            }

            cadastrarItemPedido(var_NOTA.getCampo("NUNOTA"), produto, var_EMPRESA.getCampo("CODEMP"),
                var_NOTA.getCampo("CODTIPOPER"), getCampoArquivo("QTDNEG"), (getCampoArquivo("VLRLIQUNIT") / 100), getCampoArquivo("DESCONTO"));

            log('achou produto');
			/*item.setCampo("AD_EANOL", getCampoArquivo("CODPRODPLK") );
            item.save();*/
			log('Salvou o item');
        } else {
            log("Produto não Encontrado " + getCampoArquivo("EAN"));
            notificarProdutoNaoEncontrado(var_NOTA.getCampo("NUNOTA"), getCampoArquivo("EAN"), getCampoArquivo("QTDNEG"));
            /*log('Não achou produto');
			var barras = encontrarRegistro("CodigoBarras", "CODBARRA ='"+getCampoArquivo("EAN")+"'");
            if(barras){
                log('barras entrou');
				item.setCampo("NUNOTA",var_NUNOTA);
                item.setCampo("CODEMP", var_Codemp);
                item.setCampo("CODPROD",barras.getCampo("CODPROD"));
                item.setCampo("QTDNEG",getCampoArquivo("QTDNEG"));
                item.setCampo("CODVOL",barras.getCampo("CODVOL"));
                item.setCampo("PERCDESC",getCampoArquivo("DESCONTO") / 100 );
                item.setCampo("VLRUNIT",getCampoArquivo("VLRLIQUNIT") / 100 );
				item.setCampo("VLRTOT", (getCampoArquivo("VLRLIQUNIT")/100) * getCampoArquivo("QTDNEG"));
                item.setCampo("CODLOCALORIG", 1020000);
                item.setCampo("CONTROLE"," ");
                item.setCampo("ATUALESTOQUE",0);
                item.setCampo("AD_EANOL", getCampoArquivo("EAN"));
                item.save();
                log('produto nao encontrado '+getCampoArquivo("EAN"));
            }else{
                log('barras nao entrou');
                log('EAN informado não encontrado : necessário rever cadastro ' + getCampoArquivo("EAN") );
            }*/
        }
    } else{
        item.setCampo("PERCDESC",getCampoArquivo("DESCONTO") / 100 );
        item.setCampo("VLRUNIT",getCampoArquivo("VLRLIQUNIT") / 100 );
        item.save();
    }
}

function pedidoCliente(){
    //SEM IMPLEMENTAÇÃO ATÉ O MOMENTO   
}

function totalizadores(){
	totalizarValoresNota(var_NOTA);
}

function limparTextoParaEmail(texto) {
    if (!texto) return texto;
    return String(texto)
        .replace(/[áàâãä]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòôõö]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/[ç]/g, 'c')
        .replace(/[ñ]/g, 'n')
        .replace(/[ÁÀÂÃÄ]/g, 'A')
        .replace(/[ÉÈÊË]/g, 'E')
        .replace(/[ÍÌÎÏ]/g, 'I')
        .replace(/[ÓÒÔÕÖ]/g, 'O')
        .replace(/[ÚÙÛÜ]/g, 'U')
        .replace(/[Ç]/g, 'C')
        .replace(/[Ñ]/g, 'N');
}

try {
    switch(String(getCampoArquivo('IDENTIFICADOR'))) {
        case '01': 
            try {
                dadosComprador(); 
            } catch(e1) {
                var numeroPedido = (typeof var_NOTA !== 'undefined' && var_NOTA) ? var_NOTA.getCampo("AD_NROPEDOL") : (registro.NROPEDPHARMA || "N/A");
                var msgErro = e1.getMessage ? e1.getMessage() : String(e1);
                criarFilaMensagem(
                    "alerta.integracao@licimed.com.br", 
                    limparTextoParaEmail("Erro Pedido Eletronico - PharmaLink - Identificacao do Comprador"), 
                    limparTextoParaEmail("<p>Erro na funcao: <strong>dadosComprador()</strong></p>" +
                    "<p><strong>Funcao:</strong> Busca e valida os dados do cliente comprador pelo CNPJ</p>" +
                    "<p>Nro. do Pedido: " + numeroPedido + "</p>" +
                    "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>" +
                    "<p>Erro: " + msgErro + "</p>"),
                    limparTextoParaEmail("Erro na identificacao do comprador - Pedido: " + numeroPedido + "; Layout: " + getCampoArquivo('IDENTIFICADOR') + "; Erro: " + msgErro)
                );
                throw e1;
            }
            break;
        case '02': 
            try {
                numerosPedido(); 
            } catch(e2) {
                var numeroPedido = (typeof var_NOTA !== 'undefined' && var_NOTA) ? var_NOTA.getCampo("AD_NROPEDOL") : (registro.NROPEDPHARMA || "N/A");
                var msgErro = e2.getMessage ? e2.getMessage() : String(e2);
                criarFilaMensagem(
                    "alerta.integracao@licimed.com.br", 
                    limparTextoParaEmail("Erro Pedido Eletronico - PharmaLink - Criacao/Localizacao do Pedido"), 
                    limparTextoParaEmail("<p>Erro na funcao: <strong>numerosPedido()</strong></p>" +
                    "<p><strong>Funcao:</strong> Busca pedido existente ou cria novo cabecalho de pedido com base nos dados da empresa vendedora</p>" +
                    "<p>Nro. do Pedido: " + numeroPedido + "</p>" +
                    "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>" +
                    "<p>Erro: " + msgErro + "</p>"),
                    limparTextoParaEmail("Erro na criacao/localizacao do pedido - Pedido: " + numeroPedido + "; Layout: " + getCampoArquivo('IDENTIFICADOR') + "; Erro: " + msgErro)
                );
                throw e2;
            }
            break;
        case '03': 
            try {
                formasPagamento(); 
            } catch(e3) {
                var msgErro = e3.getMessage ? e3.getMessage() : String(e3);
                criarFilaMensagem(
                    "alerta.integracao@licimed.com.br", 
                    limparTextoParaEmail("Erro Pedido Eletronico - PharmaLink - Configuracao de Pagamento"), 
                    limparTextoParaEmail("<p>Erro na funcao: <strong>formasPagamento()</strong></p>" +
                    "<p><strong>Funcao:</strong> Processa e configura as formas de pagamento do pedido PharmaLink (ignorado conforme processo TAKEDA)</p>" +
                    "<p>Nro. do Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "</p>" +
                    "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>" +
                    "<p>Erro: " + msgErro + "</p>"),
                    limparTextoParaEmail("Erro na configuracao de pagamento - Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "; Layout: " + getCampoArquivo('IDENTIFICADOR') + "; Erro: " + msgErro)
                );
                throw e3;
            }
            break;
        case '04': 
            try {
                pedidoCliente(); 
                dataPedido(); 
            } catch(e4) {
                var msgErro = e4.getMessage ? e4.getMessage() : String(e4);
                criarFilaMensagem(
                    "alerta.integracao@licimed.com.br", 
                    limparTextoParaEmail("Erro Pedido Eletronico - PharmaLink - Dados Cliente e Data"), 
                    limparTextoParaEmail("<p>Erro na funcao: <strong>pedidoCliente() e dataPedido()</strong></p>" +
                    "<p><strong>Funcao:</strong> Processa dados do pedido do cliente e valida datas</p>" +
                    "<p>Nro. do Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "</p>" +
                    "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>" +
                    "<p>Erro: " + msgErro + "</p>"),
                    limparTextoParaEmail("Erro nos dados do cliente e data - Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "; Layout: " + getCampoArquivo('IDENTIFICADOR') + "; Erro: " + msgErro)
                );
                throw e4;
            }
            break;
        case '05': 
            try {
                itemPedido(); 
            } catch(e5) {
                var msgErro = e5.getMessage ? e5.getMessage() : String(e5);
                criarFilaMensagem(
                    "alerta.integracao@licimed.com.br", 
                    limparTextoParaEmail("Erro Pedido Eletronico - PharmaLink - Cadastro de Produtos"), 
                    limparTextoParaEmail("<p>Erro na funcao: <strong>itemPedido()</strong></p>" +
                    "<p><strong>Funcao:</strong> Busca produto pelo EAN, cadastra ou atualiza itens do pedido com quantidades, valores e descontos</p>" +
                    "<p>Nro. do Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "</p>" +
                    "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>" +
                    "<p>Erro: " + msgErro + "</p>"),
                    limparTextoParaEmail("Erro no cadastro de produtos - Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "; Layout: " + getCampoArquivo('IDENTIFICADOR') + "; Erro: " + msgErro)
                );
                throw e5;
            }
            break;
        case '06': 
            try {
                totalizadores(); 
            } catch(e6) {
                var msgErro = e6.getMessage ? e6.getMessage() : String(e6);
                criarFilaMensagem(
                    "alerta.integracao@licimed.com.br", 
                    limparTextoParaEmail("Erro Pedido Eletronico - PharmaLink - Finalizacao e Calculos"), 
                    limparTextoParaEmail("<p>Erro na funcao: <strong>totalizadores()</strong></p>" +
                    "<p><strong>Funcao:</strong> Calcula e totaliza todos os valores finais do pedido (impostos, descontos, valor total)</p>" +
                    "<p>Nro. do Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "</p>" +
                    "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>" +
                    "<p>Erro: " + msgErro + "</p>"),
                    limparTextoParaEmail("Erro na finalizacao e calculos - Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "; Layout: " + getCampoArquivo('IDENTIFICADOR') + "; Erro: " + msgErro)
                );
                throw e6;
            }
            break;
        default: 
            var erroMsg = 'Linha / Tipo de Registro nao configurado ' + getCampoArquivo('IDENTIFICADOR');
            var numeroPedido = (typeof var_NOTA !== 'undefined' && var_NOTA) ? var_NOTA.getCampo("AD_NROPEDOL") : (registro.NROPEDPHARMA || "N/A");
            criarFilaMensagem(
                "alerta.integracao@licimed.com.br", 
                limparTextoParaEmail("Erro Pedido Eletronico - PharmaLink - Layout Nao Configurado"), 
                limparTextoParaEmail("<p>Erro: <strong>Layout nao configurado</strong></p>" +
                "<p>Nro. do Pedido: " + numeroPedido + "</p>" +
                "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>" +
                "<p>Mensagem: " + erroMsg + "</p>"),
                limparTextoParaEmail("Layout nao configurado - Pedido: " + numeroPedido + "; Layout: " + getCampoArquivo('IDENTIFICADOR'))
            );
            mostraErro(erroMsg);
    }
} catch(e) {
    var numeroPedido = (typeof var_NOTA !== 'undefined' && var_NOTA) ? var_NOTA.getCampo("AD_NROPEDOL") : (registro.NROPEDPHARMA || "N/A");
    var msgErro = e.getMessage ? e.getMessage() : String(e);
    criarFilaMensagem(
        "alerta.integracao@licimed.com.br", 
        limparTextoParaEmail("Erro Critico Pedido Eletronico - PharmaLink"), 
        limparTextoParaEmail("<p>Erro critico no processamento:</p>" +
        "<p>Nro. do Pedido: " + numeroPedido + "</p>" +
        "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>" +
        "<p>Erro: " + msgErro + "</p>"),
        limparTextoParaEmail("Erro critico - Pedido: " + numeroPedido + "; Layout: " + getCampoArquivo('IDENTIFICADOR') + "; Erro: " + msgErro)
    );
}
/*try{
    switch(String(getCampoArquivo('IDENTIFICADOR'))){
        case '01': dadosComprador(); break;
        case '02': numerosPedido(); break;
        case '03': formasPagamento(); break;    /*em 10.10.2023 - Ignorado - Assim como o processo TAKEDA
        case '04': pedidoCliente();  dataPedido(); break;      /*necessario implementar? 
        //case '05': dataPedido(); break;
        //case '06': log('Linha 6 ignorada.'); break;/*necessario implementar? 
        case '05': itemPedido(); break;
        case '06': totalizadores(); break;
        default: mostraErro(' Linha / Tipo de Registro não configurado '+getCampoArquivo('IDENTIFICADOR'));
    }
/*} catch(e) {
    enviarEmailErro(
        "leivyson.azevedo@gmail.com", 
        "Erro Pedido Eletrônico - IQVIA", 
        "<p>Nro. do Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "</p>" +
        "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>",
        "Nro. Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "; Nro. Layout: " + getCampoArquivo('IDENTIFICADOR'), var_NOTA.getCampo("NUNOTA"));
}*/