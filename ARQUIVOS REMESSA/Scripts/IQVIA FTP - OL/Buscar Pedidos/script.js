var_BREAK =  false;
log("Aqui se iniciou o Pós Processamento Modelo na Recepcao do Pedido IQVIA OL."); 
log("PEDIDO IQVIA NOVO");

function dadosComprador() {
    log('Executando: dadosComprador');
    var_PARCEIRO = obterCliente(registro.CNPJ_CLIENTE);
    log('Executando: fim dadosComprador');
    log('Parceior: ' + var_PARCEIRO);
}

function numerosPedido() {
    log('Executando: numerosPedido');

    var_NOTA = encontrarRegistro("CabecalhoNota", "AD_NROPEDOL = '" +registro.NROPEDIDO_OL+ "' AND AD_NUINTEGRACAO = 3 AND TIPMOV = 'P'");

    if(!var_NOTA) {
        log("Importando Pedido: " + registro.NROPEDIDO_OL);
        var_EMPRESA = encontrarRegistro("Empresa", "CGC = '" + registro.CNPJ_CD + "' AND CODEMP <= 500");

        if(!var_EMPRESA)
            mostraErro("Empresa nao cadastrada para o CNPJ " + registro.CNPJ_CD);

        var_CONFIG = encontrarRegistro('AD_PARCOL', "ID = 0");

        var_NOTA = cadastrarCabecalhoPedido(var_CONFIG, var_EMPRESA, var_PARCEIRO);
        var_NOTA.setCampo("AD_NROPEDOL", registro.NROPEDIDO_OL);
        var_NOTA.setCampo("AD_NUINTEGRACAO", 3);
        var_NOTA.setCampo("AD_STATUSOL", "I");
        var_NOTA.save();
    }
    
    log('Executando: fim numerosPedido');
}

function formasPagamento() {
    //SEM IMPLEMENTAÇÃO ATÉ O MOMENTO
}

function dadosPedido() {
     if (var_NOTA) {
        var_NOTA.setCampo("AD_NROPEDCOMPRADOR", registro.NROPEDIDO_CLIENTE);
        var_NOTA.save();
    }
}

function dataPedido() {
    //SEM IMPLEMENTAÇÃO ATÉ O MOMENTO
}

function horaPedido(){
    //SEM IMPLEMENTAÇÃO ATÉ O MOMENTO
}

function itemPedido() {
    log('itemPedido');
    var item = encontrarRegistro("ItemNota", "NUNOTA = " + var_NOTA.getCampo("NUNOTA") + " AND CODPROD IN ( SELECT CODPROD FROM TGFPRO WHERE REFERENCIA = '" + registro.EAN + "' AND ATIVO = 'S')" );
    var produto;
    var configuracao;
    var top;

    if(!item) {
        produto = encontrarRegistro('Produto',"REFERENCIA = '" + registro.EAN + "' AND ATIVO = 'S'");
        if(produto) {
            if(var_NOTA.getCampo("CODTIPOPER") == var_CONFIG.getCampo("CODTIPOPER")) {
                configuracao = encontrarRegistro("AD_PARCOL","CODMARCA = " + produto.getCampo("CODMARCA"));
                top = encontrarRegistro("TipoOperacao","CODTIPOPER = " + configuracao.getCampo("CODTIPOPER"));
                var_NOTA.setCampo("CODTIPOPER", top.getCampo("CODTIPOPER"));
                var_NOTA.setCampo("DHTIPOPER", top.getCampo("DHALTER"));
                var_NOTA.setCampo("AD_SIGLAOL", configuracao.getCampo("SIGLA"));
                var_NOTA.save();
            }
            cadastrarItemPedido(var_NOTA.getCampo("NUNOTA"), produto, var_EMPRESA.getCampo("CODEMP"),
                var_NOTA.getCampo("CODTIPOPER"), registro.QTDNEG, (registro.VLRLIQ / 100), registro.PERCDESC);
        } else {
            log("Produto não Encontrado " + registro.EAN);
            notificarProdutoNaoEncontrado(var_NOTA.getCampo("NUNOTA"), registro.EAN, registro.QTDNEG);
        }
    }else{
        item.setCampo("PERCDESC",registro.PERCDESC / 100 );
        item.setCampo("VLRUNIT",registro.VLRLIQ / 100 );
        item.save();
    }
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
        case '1': 
            try {
                dadosComprador(); 
            } catch(e1) {
                var numeroPedido = (typeof var_NOTA !== 'undefined' && var_NOTA) ? var_NOTA.getCampo("AD_NROPEDOL") : (registro.NROPEDPHARMA || "N/A");
                var msgErro = e1.getMessage ? e1.getMessage() : String(e1);
                criarFilaMensagem(
                    "alerta.integracao@licimed.com.br", 
                    limparTextoParaEmail("Erro Pedido Eletronico - IQVIA - Identificacao do Comprador"), 
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
        case '2': 
            try {
                numerosPedido(); 
            } catch(e2) {
                var numeroPedido = (typeof var_NOTA !== 'undefined' && var_NOTA) ? var_NOTA.getCampo("AD_NROPEDOL") : (registro.NROPEDPHARMA || "N/A");
                var msgErro = e2.getMessage ? e2.getMessage() : String(e2);
                criarFilaMensagem(
                    "alerta.integracao@licimed.com.br", 
                    limparTextoParaEmail("Erro Pedido Eletronico - IQVIA - Criacao/Localizacao do Pedido"), 
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
        case '3': 
            try {
                formasPagamento(); 
            } catch(e3) {
                var msgErro = e3.getMessage ? e3.getMessage() : String(e3);
                criarFilaMensagem(
                    "alerta.integracao@licimed.com.br", 
                    limparTextoParaEmail("Erro Pedido Eletronico - IQVIA - Configuracao de Pagamento"), 
                    limparTextoParaEmail("<p>Erro na funcao: <strong>formasPagamento()</strong></p>" +
                    "<p><strong>Funcao:</strong> Processa e configura as formas de pagamento do pedido IQVIA</p>" +
                    "<p>Nro. do Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "</p>" +
                    "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>" +
                    "<p>Erro: " + msgErro + "</p>"),
                    limparTextoParaEmail("Erro na configuracao de pagamento - Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "; Layout: " + getCampoArquivo('IDENTIFICADOR') + "; Erro: " + msgErro)
                );
                throw e3;
            }
            break;
        case '4': 
            try {
                dadosPedido(); 
            } catch(e4) {
                var msgErro = e4.getMessage ? e4.getMessage() : String(e4);
                criarFilaMensagem(
                    "alerta.integracao@licimed.com.br", 
                    limparTextoParaEmail("Erro Pedido Eletronico - IQVIA - Dados Complementares"), 
                    limparTextoParaEmail("<p>Erro na funcao: <strong>dadosPedido()</strong></p>" +
                    "<p><strong>Funcao:</strong> Processa dados complementares do pedido</p>" +
                    "<p>Nro. do Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "</p>" +
                    "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>" +
                    "<p>Erro: " + msgErro + "</p>"),
                    limparTextoParaEmail("Erro nos dados complementares - Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "; Layout: " + getCampoArquivo('IDENTIFICADOR') + "; Erro: " + msgErro)
                );
                throw e4;
            }
            break;
        case '5': 
            try {
                dataPedido(); 
            } catch(e5) {
                var msgErro = e5.getMessage ? e5.getMessage() : String(e5);
                criarFilaMensagem(
                    "alerta.integracao@licimed.com.br", 
                    limparTextoParaEmail("Erro Pedido Eletronico - IQVIA - Processamento de Data"), 
                    limparTextoParaEmail("<p>Erro na funcao: <strong>dataPedido()</strong></p>" +
                    "<p><strong>Funcao:</strong> Processa e valida as datas do pedido (criacao, entrega, etc.)</p>" +
                    "<p>Nro. do Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "</p>" +
                    "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>" +
                    "<p>Erro: " + msgErro + "</p>"),
                    limparTextoParaEmail("Erro no processamento de data - Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "; Layout: " + getCampoArquivo('IDENTIFICADOR') + "; Erro: " + msgErro)
                );
                throw e5;
            }
            break;
        case '6': 
            try {
                horaPedido(); 
            } catch(e6) {
                var msgErro = e6.getMessage ? e6.getMessage() : String(e6);
                criarFilaMensagem(
                    "alerta.integracao@licimed.com.br", 
                    limparTextoParaEmail("Erro Pedido Eletronico - IQVIA - Processamento de Hora"), 
                    limparTextoParaEmail("<p>Erro na funcao: <strong>horaPedido()</strong></p>" +
                    "<p><strong>Funcao:</strong> Processa e valida os horarios do pedido</p>" +
                    "<p>Nro. do Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "</p>" +
                    "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>" +
                    "<p>Erro: " + msgErro + "</p>"),
                    limparTextoParaEmail("Erro no processamento de hora - Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "; Layout: " + getCampoArquivo('IDENTIFICADOR') + "; Erro: " + msgErro)
                );
                throw e6;
            }
            break;
        case '7': 
            try {
                itemPedido(); 
            } catch(e7) {
                var msgErro = e7.getMessage ? e7.getMessage() : String(e7);
                criarFilaMensagem(
                    "alerta.integracao@licimed.com.br", 
                    limparTextoParaEmail("Erro Pedido Eletronico - IQVIA - Cadastro de Produtos"), 
                    limparTextoParaEmail("<p>Erro na funcao: <strong>itemPedido()</strong></p>" +
                    "<p><strong>Funcao:</strong> Busca produto pelo EAN, cadastra ou atualiza itens do pedido com quantidades, valores e descontos</p>" +
                    "<p>Nro. do Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "</p>" +
                    "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>" +
                    "<p>Erro: " + msgErro + "</p>"),
                    limparTextoParaEmail("Erro no cadastro de produtos - Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "; Layout: " + getCampoArquivo('IDENTIFICADOR') + "; Erro: " + msgErro)
                );
                throw e7;
            }
            break;
        case '8': 
            try {
                totalizadores(); 
            } catch(e8) {
                var msgErro = e8.getMessage ? e8.getMessage() : String(e8);
                criarFilaMensagem(
                    "alerta.integracao@licimed.com.br", 
                    limparTextoParaEmail("Erro Pedido Eletronico - IQVIA - Finalizacao e Calculos"), 
                    limparTextoParaEmail("<p>Erro na funcao: <strong>totalizadores()</strong></p>" +
                    "<p><strong>Funcao:</strong> Calcula e totaliza todos os valores finais do pedido (impostos, descontos, valor total)</p>" +
                    "<p>Nro. do Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "</p>" +
                    "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>" +
                    "<p>Erro: " + msgErro + "</p>"),
                    limparTextoParaEmail("Erro na finalizacao e calculos - Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "; Layout: " + getCampoArquivo('IDENTIFICADOR') + "; Erro: " + msgErro)
                );
                throw e8;
            }
            break;
        default: 
            var erroMsg = 'Linha nao configurada ' + getCampoArquivo('IDENTIFICADOR');
            var numeroPedido = (typeof var_NOTA !== 'undefined' && var_NOTA) ? var_NOTA.getCampo("AD_NROPEDOL") : (registro.NROPEDPHARMA || "N/A");
            criarFilaMensagem(
                "alerta.integracao@licimed.com.br", 
                limparTextoParaEmail("Erro Pedido Eletronico - IQVIA - Layout Nao Configurado"), 
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
        limparTextoParaEmail("Erro Critico Pedido Eletronico - IQVIA"), 
        limparTextoParaEmail("<p>Erro critico no processamento:</p>" +
        "<p>Nro. do Pedido: " + numeroPedido + "</p>" +
        "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>" +
        "<p>Erro: " + msgErro + "</p>"),
        limparTextoParaEmail("Erro critico - Pedido: " + numeroPedido + "; Layout: " + getCampoArquivo('IDENTIFICADOR') + "; Erro: " + msgErro)
    );
}    
/*try{
    switch (String(getCampoArquivo('IDENTIFICADOR'))) {
        case '1': dadosComprador(); break; 
        case '2': numerosPedido();  break;
        case '3': formasPagamento(); break;
        case '4': dadosPedido(); break;
        case '5': dataPedido(); break;
        case '6': horaPedido(); break;
        case '7': itemPedido(); break;
        case '8': totalizadores(); break;
        default: mostraErro('Linha não configurada '+getCampoArquivo('IDENTIFICADOR'));
    }
/*} catch(e) {
    enviarEmailErro(
        "leivyson.azevedo@gmail.com", 
        "Erro Pedido Eletrônico - IQVIA", 
        "<p>Nro. do Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "</p>" +
        "<p>Layout Nro: " + getCampoArquivo('IDENTIFICADOR') + "</p>",
        "Nro. Pedido: " + var_NOTA.getCampo("AD_NROPEDOL") + "; Nro. Layout: " + getCampoArquivo('IDENTIFICADOR'), var_NOTA.getCampo("NUNOTA"));
}*/