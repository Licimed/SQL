log("Script Global ");

function obterCliente(cnpj) {
    
    var parceiro = encontrarRegistro("Parceiro","CGC_CPF = '" + cnpj + "'");

    if(!parceiro) {
        log("Parceiro não encontrado");
        parceiro = novoParceiroDadosSefaz(cnpj);
        parceiro.setCampo("CLIENTE","S");
        parceiro.save();
        enviarEmailErro(
            "alerta.integracao@licimed.com.br", 
            "Parceiro Cadastrado Automaticamente no Sistema", 
            "<p>O Parceiro: " + parceiro.getCampo("CODPARC") + " - " + parceiro.getCampo("NOMEPARC") + " foi cadastrado no sistema via integração de pedidos OL. Será necessário finalizar o cadastro.</p>",
            null, null);
    }
    
    return parceiro;
}

function cadastrarCabecalhoPedido(configuracaoPadrao, empresa, parceiro) {
    var nota = novaLinha("CabecalhoNota");
    nota.setCampo("CODEMP",empresa.getCampo("CODEMP"));
    nota.setCampo("NUMNOTA","0");
    
    nota.setCampo("STATUSNOTA", "A");
    nota.setCampo("PENDENTE", "S");
    
    nota.setCampo("CODTIPOPER", configuracaoPadrao.getCampo("CODTIPOPER"));
    nota.setCampo("CODPARC",parceiro.getCampo("CODPARC"));
    nota.setCampo("CODTIPVENDA", configuracaoPadrao.getCampo("CODTIPVENDA"));
    nota.setCampo("CODCENCUS", configuracaoPadrao.getCampo("CODCENCUS"));
    nota.setCampo("CODNAT", configuracaoPadrao.getCampo("CODNAT"));
    nota.setCampo("CODPROJ", configuracaoPadrao.getCampo("CODPROJ"));
    nota.setCampo("CODVEND", parceiro.getCampo("CODVEND"));
    nota.setCampo("CIF_FOB", "C");
    nota.setCampo("TIPFRETE", "N");
    nota.setCampo("QTDVOL", "0");
    nota.save();
    
    return nota;
}

function cadastrarItemPedido(nuNota, produto, codEmpresa, codTipOper, quantidade, vlrUnitLiq, percDesc) {
    var item = novaLinha("ItemNota");
    item.setCampo("NUNOTA",nuNota);
    item.setCampo("CODPROD",produto.getCampo("CODPROD"));
    item.setCampo("CODEMP",codEmpresa);
    item.setCampo("QTDNEG",quantidade);
    item.setCampo("CODVOL",produto.getCampo("CODVOL"));
    item.setCampo("CONTROLE"," " );
    item.setCampo("RESERVA","N");
    item.setCampo("ATUALESTOQUE","0");
    item.setCampo("AD_PERCDESCITEM",percDesc);
    item.setCampo("VLRUNIT",vlrUnitLiq);
    item.setCampo("VLRTOT",vlrUnitLiq * quantidade);
    
    var estoqueAtual = consultaEstoquePrivado(codEmpresa,produto.getCampo("CODPROD"),null,true);
    
    log("Resultado estoqueAtual "+estoqueAtual);
    
    if (estoqueAtual > quantidade)
        estoqueAtual = quantidade;
    
    var estoqueDisp = estoqueAtual-quantidade;

    if (estoqueDisp < 0 ){
        item.setCampo("QTDCONFERIDA",estoqueDisp*-1);
        
        if (quantidade == estoqueDisp*-1)
            item.setCampo("AD_MOTIVORECUSAIQVIA","06"); //FALTA NO ESTOQUE
        else
            item.setCampo("AD_MOTIVORECUSAIQVIA","14"); //PRODUTO ATENDIDO PARCIALMENTE
    }else
        item.setCampo("AD_MOTIVORECUSAIQVIA","13"); //PRODUTO OK
    
    if (produto.getCampo("ATIVO")=="N") {
        item.setCampo("QTDCONFERIDA", quantidade);
        item.setCampo("AD_MOTIVORECUSAIQVIA","04"); //PRODUTO NÃO CADASTRADO/DESATIVADO
    }
    
    item.save();
    return item;
}

function cadastrarProdutoRecusado(nuNota, ean, quantidade) {
    var produtoRecusado = encontrarRegistro("AD_PRORECINT", "NUNOTA= '" +nuNota+ "' AND REFERENCIA = '" + ean + "'");
    
    if(!produtoRecusado) {
        produtoRecusado = novaLinha("AD_PRORECINT");
        
        produtoRecusado.setCampo("NUNOTA", nuNota);
        produtoRecusado.setCampo("REFERENCIA", ean);
        produtoRecusado.setCampo("QTDNEG", quantidade);
        
        produtoRecusado.save();
    }
}

function notificarProdutoNaoEncontrado(nuNota, ean, quantidade) {
    cadastrarProdutoRecusado(nuNota, ean, quantidade);
    
    enviarEmailErro(
        "alerta.integracao@licimed.com.br", 
        "Erro Pedido Eletrônico - Produto não Cadastrado ou Desativado no Sistema", 
        "<p>Favor realizar ativação ou o cadastro do produto referente ao EAN: " + ean + "</p>", 
        "Produto não Cadastrado EAN: " + ean + "; Nro. Pedido: " + nuNota, nuNota);
}

function totalizarValoresNota(nota) {
    var vlrtot = (consulta("SELECT SUM(VLRTOT) VLRTOT FROM TGFITE WHERE NUNOTA = "+nota.getCampo("NUNOTA")));

    if(vlrtot.get("VLRTOT")){
        nota.setCampo("VLRNOTA",vlrtot.get("VLRTOT"));
        nota.save();
    }
    recalcularImpostos(nota.getCampo("NUNOTA"));
}

function enviarEmailErro(email, assunto, mensagemEmail, mensagemErro, chave) {
    
    var fila = encontrarRegistro("MSDFilaMensagem"," ASSUNTO = '" + assunto + "'" + (chave !== null ? " AND NUCHAVE = '" + chave + "'" :  " ") + (mensagemErro !== null ? " AND MSGERRO = '" + mensagemErro  + "'" : ""));
    
    if(!fila) {
        var filaMensagem = novaLinha("MSDFilaMensagem");
        
        filaMensagem.setCampo("EMAIL", email);
        filaMensagem.setCampo("CODCON", "0");
        filaMensagem.setCampo("STATUS", "Pendente");
        filaMensagem.setCampo("TIPOENVIO", "E");
        filaMensagem.setCampo("MAXTENTENVIO", "3");
        filaMensagem.setCampo("ASSUNTO", assunto);
        filaMensagem.setCampo("MIMETYPE", "text/html");
        filaMensagem.setCampo("MENSAGEM", mensagemEmail);
        filaMensagem.setCampo("NUCHAVE", chave);
        filaMensagem.setCampo("TIPODOC", "N");
        filaMensagem.setCampo("MSGERRO", mensagemErro)
        filaMensagem.save();
    }
}

//FONTES QUE ESTAVAM NO MODELO ANTIGO FEITO PELA SANKHYA:

/*function buscaPF(regItem){
    log('Executando: funcao buscaPF');
    var regraICMS = regItem.getCampo("IDALIQICMS");
    regraICMS = 33;
    
    if(regraICMS){
        
        log('entrou regra icms');
        
        var aliquota = encontrarRegistro("AliquotaICMS","IDALIQ ="+regraICMS);
        var abcFarma = encontrarRegistro("PRECOABCFARMA","CODPROD = "+regItem.getCampo("CODPROD"));
        if(abcFarma){
            
            log('entrou preco abcfarma');
            
            var ufOrig =aliquota.getCampo("UFORIG");
            var ufDest =aliquota.getCampo("UFDEST");
            var a =-1;
            if(ufOrig!==ufDest){
                a = aliquota.getCampo("AD_ALIQINTERLIC");
            }else{
                log('Entrou no else');
                a = aliquota.getCampo("ALIQUOTA");
            }
            log("Buscando ABC Farma= " + parseInt(a) + " ufOrig = " + ufOrig + " ufDest = " + ufDest );
            
            return abcFarma.getCampo("PF"+parseInt(a));
        }else{
            log("abc Farma não encontrado para o produto: "+regItem.getCampo("CODPROD")); 
        }
    }
    return 0;
}

function buscaDeson(regItem){
    log('Executando: funcao buscaDeson');
    var regraICMS = regItem.getCampo("IDALIQICMS");
    if(regraICMS){
        
        log('entrou regra icms');
        
        var aliquota = encontrarRegistro("AliquotaICMS","IDALIQ ="+regraICMS);
        var abcFarma = encontrarRegistro("PRECOABCFARMA","CODPROD = "+regItem.getCampo("CODPROD"));
        if(abcFarma){
            var ufOrig =aliquota.getCampo("UFORIG");
            var ufDest =aliquota.getCampo("UFDEST");
            var pf;
            var a =-1;
            if(ufOrig!==ufDest){
                a = aliquota.getCampo("AD_ALIQINTERLIC");
            }else{
                a = aliquota.getCampo("ALIQICMORIG");
            }
            pf = abcFarma.getCampo("PF"+parseInt(a))
            
            //log('VALOR buscaDeson = '+( parseInt(a) / 100 ) + ' SOMA buscaDeson = '+( pf * ( parseInt(a) / 100 ) ) + ' RESULTADO buscaDeson= '+( parseFloat(pf) + parseFloat( pf * ( parseInt(a) / 100 ) ) ) );
            return ( parseFloat(pf) - parseFloat( pf * ( parseInt(a) / 100 ) ) );
        }else{
            log("abc Farma não encontrado para o produto: "+regItem.getCampo("CODPROD")); 
        }
    }
    return 0;
}

function buscaOne(regItem){
    log('Executando: funcao buscaOne');
    var regraICMS = regItem.getCampo("IDALIQICMS");
    var parceiro = encontrarRegistro("Parceiro", "CODPARC ="+var_CODPARC);
    var onerado = parceiro.getCampo("AD_ONERADO");
    var produto = encontrarRegistro( "Produto", "CODPROD="+regItem.getCampo("CODPROD") );
    var sCategoria = produto.getCampo("SEQSCA");
    
    if( onerado == 1 && ( sCategoria == 3 || sCategoria == 4 ) ){
            
            log('entrou onerado 1');
            
            if(regraICMS){
            var aliquota = encontrarRegistro("AliquotaICMS","IDALIQ ="+regraICMS);
            var abcFarma = encontrarRegistro("PRECOABCFARMA","CODPROD = "+regItem.getCampo("CODPROD"));
            if(abcFarma){
                var ufOrig =aliquota.getCampo("UFORIG");
                var ufDest =aliquota.getCampo("UFDEST");
                var pf;
                var a =-1;
                if(ufOrig!==ufDest){
                    a = aliquota.getCampo("AD_ALIQINTERLIC");
                }else{
                    a = aliquota.getCampo("ALIQICMORIG");
                }
                pf = abcFarma.getCampo("PF"+parseInt(a));
                
                return ( parseFloat(pf) + parseFloat(pf * (parseInt(a) / 100)) );
            }else{
                log("abc Farma nao encontrado para o produto: "+regItem.getCampo("CODPROD")); 
            }
        }
    }else if(!onerado){
        if(regraICMS){
        var aliquota = encontrarRegistro("AliquotaICMS","IDALIQ ="+regraICMS);
        var abcFarma = encontrarRegistro("PRECOABCFARMA","CODPROD = "+regItem.getCampo("CODPROD"));
        
        log('entrou onerado 2');
        
        if(abcFarma){
            var ufOrig =aliquota.getCampo("UFORIG");
            var ufDest =aliquota.getCampo("UFDEST");
            var a =-1;
            var pf;
            if(ufOrig!==ufDest){
                a = aliquota.getCampo("AD_ALIQINTERLIC");
            }else{
                a = aliquota.getCampo("ALIQICMORIG");
            }
            pf = abcFarma.getCampo("PF"+parseInt(a));
            return ( pf );
        }else{
            log("abc Farma nao encontrado para o produto: "+regItem.getCampo("CODPROD")); 
        }
    }
    return 0;
    }
}*/

function consultaEstoquePrivado(codEmp, codProd, codLocal, reserva) {
    log('=== INÍCIO consultaEstoquePrivado ===');
    log('codEmp: ' + codEmp);
    log('codProd: ' + codProd);
    log('reserva: ' + reserva);

    var sql = "SELECT SUM(ESTOQUE ";
    if (reserva) {
        sql += " - RESERVADO";
    }
    sql += ") AS TOTAL " +
           "FROM TGFEST EST " +
           "INNER JOIN TGFLOC LOC ON LOC.CODLOCAL = EST.CODLOCAL " +
           "WHERE EST.CODPROD = " + codProd + 
           " AND EST.TIPO = 'P' " +
           " AND EST.CODPARC = 0 " +
           " AND EST.CODEMP = " + codEmp +
           " AND LOC.DESCRLOCAL LIKE '%PRIVADO%'";

    log('SQL executado: ' + sql);

    var result = consulta(sql);

    if (result.get("TOTAL")) {
        var total = parseFloat(result.get("TOTAL"));
        log('Estoque encontrado (PRIVADO): ' + total);
        return total;
    } else {
        log('Nenhum estoque encontrado (LOCAL PRIVADO).');
        return 0;
    }
}

function autenticar() {
    log('Iniciando autenticacao...');
    
    var query = "SELECT NOMEUSU, INTERNO FROM TSIUSU WHERE CODUSU = 0";
    log('Query executada: ' + query);
    
    var result = consulta(query);
    log('Resultado da consulta: ' + result);
    
    if (result) {
        var nomeUsuario = result.get("NOMEUSU");
        var interno = result.get("INTERNO");
        log('Usuario encontrado: ' + nomeUsuario);
        log('Interno: ' + interno);
        
        return efetuarLogin(nomeUsuario, interno);
    } else {
        log('Erro: Resultado da consulta e nulo ou vazio');
        return null;
    }
}

function efetuarLogin(usuario, senha) {
    log('Iniciando efetuarLogin...');
    log('Parametro usuario recebido: ' + usuario);
    log('Parametro senha recebido: ' + senha);
    
    var stringXML = "<serviceRequest><requestBody><NOMUSU>" + usuario + "</NOMUSU><INTERNO2>" + senha + "</INTERNO2></requestBody></serviceRequest>";
    log('XML gerado: ' + stringXML);
    
    log('Usando APIs server-side do Sankhya...');
    
    var query = "SELECT TEXTO AS URLSANKHYA FROM TSIPAR WHERE CHAVE = 'URLSANKHYAW'";
    log('Query para URL: ' + query);
    
    var result = consulta(query);
    log('URL resultado: ' + result);
    
    if (result) {
        var urlSankhya = result.get("URLSANKHYA");
        log('URL Sankhya: ' + urlSankhya);
        
        var fullUrl = urlSankhya + "/mge/service.sbr?serviceName=MobileLoginSP.login";
        log('URL completa: ' + fullUrl);
        
        try {
            log('Iniciando requisicao HTTP com HttpURLConnection...');
            
            var url = new java.net.URL(fullUrl);
            var connection = url.openConnection();
            
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/xml");
            connection.setRequestProperty("Accept", "application/xml");
            connection.setDoOutput(true);
            connection.setDoInput(true);
            
            log('Conexao configurada - POST para: ' + fullUrl);
            
            var outputStream = connection.getOutputStream();
            var writer = new java.io.OutputStreamWriter(outputStream, "ISO-8859-1");
            writer.write(stringXML);
            writer.flush();
            writer.close();
            outputStream.close();
            
            log('Payload XML enviado: ' + stringXML);
            
            var responseCode = connection.getResponseCode();
            log('Codigo de resposta HTTP: ' + responseCode);
            
            if (responseCode >= 200 && responseCode < 300) {
                // Sucesso - lendo resposta
                var inputStream = connection.getInputStream();
                var reader = new java.io.BufferedReader(new java.io.InputStreamReader(inputStream, "ISO-8859-1"));
                var response = "";
                var line;
                
                while ((line = reader.readLine()) != null) {
                    response += line;
                }
                
                reader.close();
                inputStream.close();
                
                log('Resposta recebida com sucesso: ' + response);
                log('Tamanho da resposta: ' + response.length);
                log('Resposta sem espacos: ' + response.replace(/\s/g, ''));
                
                var sessionStart = response.indexOf('<jsessionid>');
                var sessionEnd = response.indexOf('</jsessionid>');
                
                if (sessionStart != -1 && sessionEnd != -1) {
                    var session = response.substring(sessionStart + 12, sessionEnd);
                    log('Sessao obtida: ' + session);
                    
                    return {
                        status: 'login_sucesso',
                        session: session,
                        urlSankhya: urlSankhya,
                        usuario: usuario,
                        senha: senha,
                        responseCode: responseCode,
                        response: response
                    };
                } else {
                    log('Erro: nao foi possivel extrair a sessao da resposta');
                    return {
                        status: 'erro_sessao',
                        urlSankhya: urlSankhya,
                        usuario: usuario,
                        responseCode: responseCode,
                        response: response
                    };
                }
                
            } else {
                log('Erro HTTP - codigo: ' + responseCode);
                return {
                    status: 'erro_http_login',
                    responseCode: responseCode,
                    urlSankhya: urlSankhya,
                    usuario: usuario
                };
            }
            
        } catch (httpError) {
            log('Erro na requisicao HTTP: ' + httpError.getMessage());
            return {
                status: 'erro_requisicao_http',
                error: httpError.getMessage(),
                urlSankhya: urlSankhya,
                usuario: usuario
            };
        }
        
    } else {
        log('Erro: Nao foi possivel obter a URL do Sankhya');
        return null;
    }
}

function criarFilaMensagem(email, assunto, mensagemEmail, mensagemErro) {
    var loginResult = autenticar();
    
    if (!loginResult || loginResult.status !== 'login_sucesso') {
        log('Erro: Nao foi possivel fazer login');
        return {
            status: 'erro_login',
            message: 'Falha na autenticacao',
            loginResult: loginResult
        };
    }
    
    var session = loginResult.session;
    var urlSankhya = loginResult.urlSankhya;
    
    log('Usando sessao para criar fila de mensagem: ' + session);
    
    var stringXML = '<serviceRequest serviceName="CRUDServiceProvider.saveRecord">' +
                                                '<requestBody>' +
                                                    '<dataSet rootEntity="MSDFilaMensagem" includePresentationFields="S" datasetid="1444487520009_1">' +
                                                        '<entity path="">' +
                                                            '<fieldset/><field/>' +
                                                        '</entity>' +
                                                        '<dataRow>' +  
                                                            '<localFields>' +  
                                                                '<EMAIL>' +
                                                                '<![CDATA[' + email + ']]>' +
                                                                '</EMAIL>' +
                                                                '<CODCON>' +
                                                                    '<![CDATA[0]]>'+
                                                                '</CODCON>' +
                                                                '<STATUS>' +
                                                                    '<![CDATA[Pendente]]>'+
                                                                '</STATUS>' +
                                                                '<TIPOENVIO>' +
                                                                    '<![CDATA[E]]>'+
                                                                '</TIPOENVIO>' +
                                                                '<MAXTENTENVIO>' +
                                                                    '<![CDATA[3]]>'+
                                                                '</MAXTENTENVIO>' +
                                                                '<ASSUNTO>' + 
                                                                    '<![CDATA[' + assunto + ']]>'+
                                                                '</ASSUNTO>' +
                                                                '<MIMETYPE>' +
                                                                    '<![CDATA[text/html]]>'+
                                                                '</MIMETYPE>' +
                                                                '<MENSAGEM>' +
                                                                    '<![CDATA[' + mensagemEmail + ']]>'+
                                                                '</MENSAGEM>' +
                                                                '<TIPODOC>' +
                                                                    '<![CDATA[N]]>'+
                                                                '</TIPODOC>' +
                                                                '<MSGERRO>' +
                                                                    '<![CDATA[' + mensagemErro + ']]>'+
                                                                '</MSGERRO>' +
                                                            '</localFields>' +
                                                        '</dataRow>' +
                                                    '</dataSet>' +
                                                '</requestBody>' +
                                        '</serviceRequest>';
    
    try {
        log('Iniciando salvamento da fila de mensagem...');
        var saveUrl = urlSankhya + "/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&mgeSession=" + session;
        
        log('URL de salvamento: ' + saveUrl);
        log('Payload de salvamento: ' + stringXML);
        
        var saveUrlObj = new java.net.URL(saveUrl);
        var saveConnection = saveUrlObj.openConnection();
        
        saveConnection.setRequestMethod("POST");
        saveConnection.setRequestProperty("Content-Type", "application/xml");
        saveConnection.setRequestProperty("Accept", "application/xml");
        saveConnection.setRequestProperty("Cookie", "JSESSIONID=" + session);
        saveConnection.setDoOutput(true);
        saveConnection.setDoInput(true);
        
        log('Header Cookie adicionado: JSESSIONID=' + session);
        
        var saveOutputStream = saveConnection.getOutputStream();
        var saveWriter = new java.io.OutputStreamWriter(saveOutputStream, "ISO-8859-1");
        saveWriter.write(stringXML);
        saveWriter.flush();
        saveWriter.close();
        saveOutputStream.close();
        
        var saveResponseCode = saveConnection.getResponseCode();
        log('Codigo de resposta do salvamento: ' + saveResponseCode);
        
        if (saveResponseCode >= 200 && saveResponseCode < 300) {
            var saveInputStream = saveConnection.getInputStream();
            var saveReader = new java.io.BufferedReader(new java.io.InputStreamReader(saveInputStream, "ISO-8859-1"));
            var saveResponse = "";
            var saveLine;
            
            while ((saveLine = saveReader.readLine()) != null) {
                saveResponse += saveLine;
            }
            
            saveReader.close();
            saveInputStream.close();
            
            log('Resposta do salvamento: ' + saveResponse);
            
            return {
                status: 'sucesso',
                session: session,
                responseCode: saveResponseCode,
                response: saveResponse,
                message: 'Fila de mensagem criada com sucesso'
            };
            
        } else {
            log('Erro no salvamento - codigo: ' + saveResponseCode);
            return {
                status: 'erro_salvamento',
                session: session,
                responseCode: saveResponseCode,
                message: 'Erro ao salvar fila de mensagem'
            };
        }
        
    } catch (httpError) {
        log('Erro na requisicao HTTP: ' + httpError.getMessage());
        return {
            status: 'erro_http',
            error: httpError.getMessage(),
            message: 'Erro na comunicacao HTTP'
        };
    }
}