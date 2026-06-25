var data = toJson(getCampoArquivo("json"));
log("Aqui se iniciou o Pos Processamento Fidelize na Recepcao do Pedido.");
var pag = data.data.orders;
log("PEDIDO FIDELIZE\n" + JSON.stringify(data));

/*var order;
var product;

var cabecalhoNota;
var empresa;
var parceiro;
var parametro;
var modeloPedido;
var produto;

if(pag){
    if(pag.total > 0) {
        for(var i = 0; i < pag.total; i++) {
            order = pag.data[i];

            try{
                cabecalhoNota = encontrarRegistro("CabecalhoNota", "AD_NROPEDOL = " + order.order_code + " AND AD_NUINTEGRACAO = 2");

                if(cabecalhoNota === null) {
                    log("Importando Pedido: " + order.order_code);

                    empresa = encontrarRegistro("Empresa", "CGC = '" + order.wholesaler_branch_code + "'");
                    if(!empresa)
                        mostraErro("Empresa nao cadastrada para o CNPJ " + order.wholesaler_branch_code);

                    parceiro = obterCliente(order.customer_code);
                    parametro = encontrarRegistro("ParametroSistema","CHAVE = 'CODMODPEDOL'");
                    modeloPedido = encontrarRegistro("CabecalhoNota","NUNOTA = " + parametro.getCampo("INTEIRO"));

                    cabecalhoNota = cadastrarCabecalhoPedido(modeloPedido, empresa, parceiro);
                    cabecalhoNota.setCampo("AD_NROPEDOL", order.order_code);
                    cabecalhoNota.setCampo("AD_NUINTEGRACAO", 2);
                    cabecalhoNota.setCampo("AD_STATUSOL", "I");
                    cabecalhoNota.save();

                    if(order.products.length > 0) {
                        for(var j = 0; j < order.products.length; j++) {
                            log("NOTA: " + cabecalhoNota.getCampo("NUNOTA"));
                            product = order.products[j];
                            produto = encontrarRegistro('Produto',"REFERENCIA = '" + product.ean + "' AND ATIVO = 'S'");

                            if(produto) {
                                try {
                                    cadastrarItemPedido(cabecalhoNota.getCampo("NUNOTA"), produto, empresa.getCampo("CODEMP"),
                                            cabecalhoNota.getCampo("CODTIPOPER"), product.amount, product.net_value, product.discount_percentage);
                                } catch(e) {
                                    notificarProdutoInvalidoComercio(cabecalhoNota.getCampo("NUNOTA"), produto, product.amount);
                                }
                            } else {
                                log("Produto não Encontrado " + product.ean);
                                notificarProdutoNaoEncontrado(cabecalhoNota.getCampo("NUNOTA"), product.ean, product.amount);
                            }
                        }

                        totalizarValoresNota(cabecalhoNota);
                    }
                } else
                    log("Pedido já importado anteriormente");
            } catch(e) {
                enviarEmailErro(
                    "leivyson.azevedo@gmail.com", 
                    "Erro Pedido Eletrônico", 
                    "<p>Nro. do Pedido: " + order.order_code + "</p>",
                    "Nro. Pedido: " + order.order_code, null);
            }
        }
    }
}


log("Teste log");*/
//log("Importando " + JSON.stringify(order));