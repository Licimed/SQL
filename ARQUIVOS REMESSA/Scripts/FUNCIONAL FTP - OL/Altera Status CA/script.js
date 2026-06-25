var data = toJson(getCampoArquivo("json"));
var groupedOrder = data.data.groupedOrder;
if(groupedOrder !== null) {
    log("Pos processamento groupedOrder "+JSON.stringify(data.data));

    var nota = encontrarRegistro("CabecalhoNota", "NUNOTA IN (SELECT DISTINCT ITE.NUNOTA FROM TGFITE ITE " +
        "INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA LEFT JOIN TGFVAR VAR ON VAR.NUNOTAORIG = CAB.NUNOTA " +
        "WHERE ITE.AD_NROPEDOL = " + groupedOrder.id + " AND VAR.NUNOTAORIG IS NULL) AND AD_NUINTEGRACAO = 2 AND " +
        "AD_STATUSOL IN ('PROCESSING', 'AWAITING_PROCESSING', 'AWAITING_CANCELLATION_PROCESSING')");
    
    log("STATUS: " + groupedOrder.status);

    nota.setCampo("AD_STATUSOL", groupedOrder.status);
    nota.save();
    
    var product;
    var item;
    
    log("Itens: " + groupedOrder.total_products);
    
    for(var i = 0; i < groupedOrder.total_products; i++) {
        product = groupedOrder.products[i];
        
        log("Item: " + product);
        
        item = encontrarRegistro("ItemNota", "NUNOTA = " + nota.getCampo("NUNOTA") + " AND CODPROD IN (SELECT CODPROD FROM TGFPRO WHERE REFERENCIA = '" + product.ean + "')");
        
        if(item !== null) {
            item.setCampo("AD_STATUSCA", product.product_reason);
            if(product.product_reason == "COMMERCIAL_POLICIES_NOT_FOUND_FOR_PRODUCT_ON_INDUSTRY_OL_PORTAL" || product.product_reason == "PRODUCT_DISABLED_ON_INDUSTRY_OL_PORTAL" || product.product_reason == "CLIENT_NOT_FOUND_ON_INDUSTRY_OL_PORTAL")
                item.setCampo("PENDENTE", "N");
            item.save();
        }
    }
}