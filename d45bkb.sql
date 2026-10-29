SELECT		 GIR.CODGRUPAI

			,GIR.GRUPO_PAI

			,GIR.CODGRUPOPROD

			,GIR.GRUPO

			,GIR.CODPROD

			,GIR.DESCRPROD

			,GIR.MARCA

			,GIR.CODPAT

			,GIR.DESCRICAO

            /* NOVO CAMPO: Identifica se a linha é Público ou Privado com base no filtro */

            ,GIR.CANAL_NOMINAL

			,GIR.ULT12_RS

			,GIR.QTD_12

			,GIR.QTD_03

			,GIR.QTD_01

			,GIR.QTD_RECENTE

			,GIR.PERC

			,GIR.ACUM

			,GIR.CURVA

			,GIR.MDV_12

			,GIR.MDV_03

			,GIR.MDV_01

			,GIR.MDV

			,GIR.MDV_AJUST

			,GIR.MDV_RECENTE

			,GIR.DT_ULTIMA_ENTRADA

			,GIR.ESTOQUE

			,GIR.CUSTO_UNIT * GIR.ESTOQUE AS ESTOQUE_RS

			,GIR.RESERVADO

			,GIR.DISPONIVEL

			,GIR.EM_PEDIDO

			,GIR.E_MAX

			,GIR.DDV

			,(	CASE WHEN (DISPONIVEL - E_MAX) > 0	THEN (DISPONIVEL - E_MAX)

													ELSE 0

				END

			 ) EXCED

			,(	CASE WHEN (DISPONIVEL - E_MAX) > 0		THEN (CUSTO_UNIT*(DISPONIVEL - E_MAX))

														ELSE 0

				END

			 ) EXCED_CUSTO

			,GIR.LEADTIME

			,(	CASE WHEN PP < 0	THEN 0

									ELSE PP

				END

			 ) PP

			,(	CASE	WHEN GIR.PERMCOMPPROD = 'N'					THEN 0

						WHEN MDV_AJUST < 0							THEN 0 

						WHEN DISPONIVEL > PP						THEN 0

						WHEN DISPONIVEL < (MDV_AJUST*GIR.LEADTIME)	THEN	(	CASE WHEN EM_PEDIDO>E_MAX	THEN 0

																											ELSE	(	CASE WHEN ((DISPONIVEL+EM_PEDIDO)<(MDV_AJUST*GIR.LEADTIME))	THEN E_MAX

																																													ELSE (E_MAX-((DISPONIVEL+EM_PEDIDO)-(MDV_AJUST*GIR.LEADTIME)))

																														END

																													)

																				END

																			)

																	ELSE	(	CASE WHEN (((E_MAX+(MDV_AJUST*GIR.LEADTIME)-DISPONIVEL-EM_PEDIDO))) < 0		THEN 0

																																							ELSE (((E_MAX+(MDV_AJUST*GIR.LEADTIME)-DISPONIVEL-EM_PEDIDO)))

																				END

																			)

				END

			 ) SUGESTAO

			,CUSTO_UNIT

			,(	CASE WHEN GIR.ULT12_RS <> 0 AND GIR.QTD_12 <> 0	THEN GIR.QTD_12/GIR.QTD_12

																	ELSE 0

				END

			 ) MPU_RS

			,(	CASE WHEN GIR.PERMCOMPPROD = 'N'	THEN 0 

													ELSE	(	CASE WHEN GIR.DISPONIVEL > ((NVL(GIR.LEADTIME,0))*GIR.MDV_AJUST)	THEN 0

																																	ELSE (GIR.LEADTIME*GIR.MDV_AJUST) - GIR.DISPONIVEL

																END

															) 

				END

			 ) RUPTURA_QTD

			,(	CASE  WHEN GIR.PERMCOMPPROD = 'N'	THEN 0 

													ELSE	(	CASE WHEN GIR.DISPONIVEL > ((NVL(GIR.LEADTIME,0)) * GIR.MDV_AJUST)	THEN 0

																																	ELSE (GIR.LEADTIME*GIR.MDV_AJUST) - GIR.DISPONIVEL

																END

															) 

				END

			 ) * GIR.CUSTO_UNIT RUPTURA_RS

FROM	(	SELECT	 SUB.CODPROD

					,SUB.CODGRUPOPROD

					,SUB.DESCRPROD

					,SUB.MARCA

					,SUB.CODPAT

					,SUB.PERMCOMPPROD

					,SUB.CODGRUPAI

					,SUB.GRUPO_PAI

					,SUB.GRUPO

					,SUB.DESCRICAO

                    /* Define o nome do canal baseado no parâmetro informado */

                    ,CASE WHEN :CANAL = 0 THEN 'PRIVADO' ELSE 'PUBLICO' END AS CANAL_NOMINAL

					,SUB.ULT12_RS

					,SUB.ULT12_QTD AS QTD_12

					,SUB.ULT03_QTD AS QTD_03

					,SUB.ULT01_QTD AS QTD_01

					,SUB.ATUAL_QTD AS QTD_RECENTE

					,SUB.PERC * 100 PERC

					,SUB.ACUM

					,SUB.CURVA

					,SUB.MDV_12

					,SUB.MDV_03

					,SUB.MDV_01

					,SUB.MDV

					,SUB.MDV_AJUST

					,SUB.MDV_RECENTE

					,ULTENT.DT_ULTIMA_ENTRADA

					,NVL(EST.ESTOQUE, 0) ESTOQUE

					,NVL(RES.QTDRESERVA, 0) RESERVADO

					,NVL(EST.ESTOQUE - NVL(RES.QTDRESERVA, 0),0) DISPONIVEL

					,NVL(PED.QTDTRANSITO,0) EM_PEDIDO

					,NVL(SUB.LEADTIME, 0) LEADTIME

					,(	CASE	WHEN SUB.CURVA = 'A'	THEN (SUB.MDV_AJUST * (:DDV_A + :DDV_SEG))

								WHEN SUB.CURVA = 'B'	THEN (SUB.MDV_AJUST * (:DDV_B + :DDV_SEG))

														ELSE (SUB.MDV_AJUST * (:DDV_C + :DDV_SEG))

						END

					 ) E_MAX

					,(	CASE WHEN NVL(EST.ESTOQUE - NVL(RES.QTDRESERVA, 0), 0) <> 0 AND SUB.MDV_AJUST <> 0	THEN (NVL(EST.ESTOQUE - NVL(RES.QTDRESERVA, 0), 0) / SUB.MDV_AJUST)

																									ELSE 0

					  	END

					 ) DDV

					,(	CASE WHEN ((SUB.MDV_AJUST * NVL(SUB.LEADTIME,1))+(SUB.MDV_AJUST*(:DDV_SEG))) = 1	THEN 2

																											ELSE ((SUB.MDV_AJUST * NVL(SUB.LEADTIME,1))+(SUB.MDV_AJUST*(:DDV_SEG)))

						END

					 ) PP

					,NVL(	(	SELECT SUM(CUSTO)

								FROM	(	SELECT  CUS.CUSREP CUSTO

											FROM	TGFCUS CUS

											WHERE

													CUS.CODPROD = SUB.CODPROD

												AND CUS.CODLOCAL IN (SELECT CODLOCAL FROM TGFLOC WHERE DESCRLOCAL LIKE CASE WHEN :CANAL = 0		THEN '%PRIVADO%'

																																				ELSE '%PUBLICO%' END)

												AND CUS.CODEMP IN :CODEMP

												AND CUS.DTATUAL = 	(	SELECT MAX(CUS2.DTATUAL)

																		FROM TGFCUS CUS2

																		WHERE

																				CUS2.CODPROD = CUS.CODPROD

																			AND CUS2.CODLOCAL IN (SELECT CODLOCAL FROM TGFLOC WHERE DESCRLOCAL LIKE CASE WHEN :CANAL = 0	THEN '%PRIVADO%'

																																											ELSE '%PUBLICO%' END)

																			AND CUS2.CODEMP IN :CODEMP

																	)

											ORDER BY CUS.DTATUAL DESC

										)

							),0

						) AS CUSTO_UNIT

					,SUB.EXCLUIOL

			FROM	(	SELECT	 CODPROD

								,LEADTIME

								,CODGRUPOPROD

								,DESCRPROD

								,MARCA

								,CODPAT

								,PERMCOMPPROD

								,EXCLUIOL

								,CODGRUPAI

								,GRUPO_PAI

								,GRUPO

								,DESCRICAO

								,ULT12_RS

								,ULT12_QTD

								,ULT03_QTD

								,ULT01_QTD

								,ATUAL_QTD

								,(CASE WHEN ULT12_RS <> 0 AND TOTAL <> 0 THEN (ULT12_RS/TOTAL) ELSE 0 END) PERC

								,(SUM((CASE WHEN ULT12_RS <> 0 AND TOTAL <> 0 THEN ULT12_RS/TOTAL ELSE 0 END)) OVER (ORDER BY (CASE WHEN ULT12_RS <> 0 AND TOTAL <> 0 THEN ULT12_RS/TOTAL ELSE 0 END) DESC)) ACUM

								,CASE    WHEN (SUM((CASE WHEN ULT12_RS <> 0 AND TOTAL <> 0 THEN ULT12_RS/TOTAL ELSE 0 END)) OVER (ORDER BY (CASE WHEN ULT12_RS <> 0 AND TOTAL <> 0 THEN ULT12_RS/TOTAL ELSE 0 END) DESC)) <= 0.8		THEN  'A'

										WHEN (SUM((CASE WHEN ULT12_RS <> 0 AND TOTAL <> 0 THEN ULT12_RS/TOTAL ELSE 0 END)) OVER (ORDER BY (CASE WHEN ULT12_RS <> 0 AND TOTAL <> 0 THEN ULT12_RS/TOTAL ELSE 0 END) DESC)) <= 0.95	THEN  'B'

																																																									ELSE  'C'

								 END CURVA

								,(CASE WHEN ULT12_QTD <> 0 AND ULT12_DIAS <> 0 THEN (ULT12_QTD / ULT12_DIAS) ELSE 0 END) MDV_12

								,(CASE WHEN ULT03_QTD <> 0 AND ULT03_DIAS <> 0 THEN (ULT03_QTD / ULT03_DIAS) ELSE 0 END) MDV_03

								,(CASE WHEN ULT01_QTD <> 0 AND ULT01_DIAS <> 0 THEN (ULT01_QTD / ULT01_DIAS) ELSE 0 END) MDV_01

								,(	(		((CASE WHEN ULT12_QTD <> 0 AND ULT12_DIAS <> 0 THEN ULT12_QTD / ULT12_DIAS ELSE 0 END)*1)

										+	((CASE WHEN ULT03_QTD <> 0 AND ULT03_DIAS <> 0 THEN ULT03_QTD / ULT03_DIAS ELSE 0 END)*2)

										+	((CASE WHEN ULT01_QTD <> 0 AND ULT01_DIAS <> 0 THEN ULT01_QTD / ULT01_DIAS ELSE 0 END)*3)

									)/6

								 ) MDV

								,(CASE WHEN :AJUSTE = 0	THEN	(	(		((CASE WHEN ULT12_QTD <> 0 AND ULT12_DIAS <> 0 THEN ULT12_QTD / ULT12_DIAS ELSE 0 END)*1)

																	+	((CASE WHEN ULT03_QTD <> 0 AND ULT03_DIAS <> 0 THEN ULT03_QTD / ULT03_DIAS ELSE 0 END)*2)

																	+	((CASE WHEN ULT01_QTD <> 0 AND ULT01_DIAS <> 0 THEN ULT01_QTD / ULT01_DIAS ELSE 0 END)*3)

																)/6

															)

														ELSE	(	(		((CASE WHEN ULT12_QTD <> 0 AND ULT12_DIAS <> 0 THEN ULT12_QTD / ULT12_DIAS ELSE 0 END)*1)

																		+	((CASE WHEN ULT03_QTD <> 0 AND ULT03_DIAS <> 0 THEN ULT03_QTD / ULT03_DIAS ELSE 0 END)*2)

																		+	((CASE WHEN ULT01_QTD <> 0 AND ULT01_DIAS <> 0 THEN ULT01_QTD / ULT01_DIAS ELSE 0 END)*3)

																	)/6

																)*(:AJUSTE/100) +	(	(		((CASE WHEN ULT12_QTD <> 0 AND ULT12_DIAS <> 0 THEN ULT12_QTD / ULT12_DIAS ELSE 0 END)*1)

																					+	((CASE WHEN ULT03_QTD <> 0 AND ULT03_DIAS <> 0 THEN ULT03_QTD / ULT03_DIAS ELSE 0 END)*2)

																					+	((CASE WHEN ULT01_QTD <> 0 AND ULT01_DIAS <> 0 THEN ULT01_QTD / ULT01_DIAS ELSE 0 END)*3)

																				)/6

																			)

									END

								 ) MDV_AJUST

								,(CASE WHEN ATUAL_QTD <> 0 AND ATUAL_DIAS <> 0 THEN ATUAL_QTD / ATUAL_DIAS ELSE 0 END) MDV_RECENTE

								,TOTAL

						FROM	(	SELECT	 PRO.CODPROD 

											,PRO.LEADTIME 

											,PRO.CODGRUPOPROD 

											,PRO.DESCRPROD

											,PRO.MARCA 

											,PRO.CODPAT 

											,PRO.PERMCOMPPROD  

											,'N' AS EXCLUIOL

											,GR2.CODGRUPAI

											,GR2.DESCRGRUPOPROD GRUPO_PAI

											,GRU.DESCRGRUPOPROD GRUPO

											,PAT.DESCRICAO

											,NVL(SUB.ULT12_RS, 0) AS ULT12_RS

											,NVL(SUM(SUB.ULT12_RS) OVER (PARTITION BY 0), 0) TOTAL 

											,NVL(SUB.ULT12_QTD, 0) AS ULT12_QTD

											,LAST_DAY(ADD_MONTHS(SYSDATE,-1))-(LAST_DAY(ADD_MONTHS(SYSDATE,-8))) ULT12_DIAS

											,NVL(SUB.ULT03_QTD, 0) AS ULT03_QTD

											,LAST_DAY(ADD_MONTHS(SYSDATE,-1))-(LAST_DAY(ADD_MONTHS(SYSDATE,-4))) ULT03_DIAS

											,NVL(SUB.ULT01_QTD, 0) AS ULT01_QTD

											,LAST_DAY(ADD_MONTHS(SYSDATE,-1))-(LAST_DAY(ADD_MONTHS(SYSDATE,-2))) ULT01_DIAS

											,NVL(SUB.ATUAL_QTD, 0) AS ATUAL_QTD

											,CASE WHEN  (SYSDATE-(LAST_DAY(ADD_MONTHS(SYSDATE,-1)))) = 0	THEN 1

																											ELSE (SYSDATE-(LAST_DAY(ADD_MONTHS(SYSDATE,-1))))

											 END ATUAL_DIAS

									FROM TGFPRO PRO

									LEFT JOIN	(	SELECT		 PRO.CODPROD CODPROD 

																,NVL	(SUM	(	CASE WHEN		CAB.DTNEG >= TO_CHAR((LAST_DAY(ADD_MONTHS(SYSDATE,-13))+1))

																								AND CAB.DTNEG <= TO_CHAR(LAST_DAY(ADD_MONTHS(SYSDATE,-1)))			THEN	CASE WHEN TOP.GRUPO = 'Vendas'  THEN (ITE.VLRTOT - ITE.VLRREPRED - ITE.VLRDESC+ITE.VLRSUBST)

																																																			ELSE (ITE.VLRTOT - ITE.VLRREPRED - ITE.VLRDESC+ITE.VLRSUBST)*(-1)

																																											END

																					END

																				) ,0

																		) ULT12_RS

																,NVL	(	SUM	(	CASE WHEN		CAB.DTNEG >= TO_CHAR((LAST_DAY(ADD_MONTHS(SYSDATE,-13))+1))

																								AND CAB.DTNEG <= TO_CHAR(LAST_DAY(ADD_MONTHS(SYSDATE,-1)))			THEN	CASE WHEN TOP.GRUPO = 'Vendas'  THEN ITE.QTDNEG

																																																			ELSE ITE.QTDNEG*(-1)

																																											END

																					END

																				) ,0

																		) ULT12_QTD

																,NVL	(	SUM	(	CASE WHEN		CAB.DTNEG >= TO_CHAR((LAST_DAY(ADD_MONTHS(SYSDATE,-4))+1))

																								AND CAB.DTNEG <= TO_CHAR(LAST_DAY(ADD_MONTHS(SYSDATE,-1)))			THEN	CASE WHEN TOP.GRUPO = 'Vendas'  THEN ITE.QTDNEG

																																																			ELSE ITE.QTDNEG*(-1)

																																											END

																					END

																				) ,0

																		) ULT03_QTD

																,NVL	(	SUM	(	CASE WHEN		CAB.DTNEG >= TO_CHAR((LAST_DAY(ADD_MONTHS(SYSDATE,-2))+1))

																								AND CAB.DTNEG <= TO_CHAR(LAST_DAY(ADD_MONTHS(SYSDATE,-1)))			THEN	CASE WHEN TOP.GRUPO = 'Vendas'  THEN ITE.QTDNEG

																																																			ELSE ITE.QTDNEG*(-1)

																																											END

																					END

																				) ,0

																		) ULT01_QTD

																,NVL	(	SUM	(	CASE WHEN		CAB.DTNEG >= TO_CHAR((LAST_DAY(ADD_MONTHS(SYSDATE,-1))+1))

																								AND CAB.DTNEG <= TO_CHAR(LAST_DAY(ADD_MONTHS(SYSDATE,0)))			THEN	CASE WHEN TOP.GRUPO = 'Vendas'  THEN ITE.QTDNEG

																																																			ELSE ITE.QTDNEG*(-1)

																																											END

																					END

																				) ,0

																		) ATUAL_QTD

													FROM TGFPRO PRO

													LEFT JOIN TGFITE ITE ON ITE.CODPROD = PRO.CODPROD

													LEFT JOIN TGFCAB CAB ON ITE.NUNOTA = CAB.NUNOTA

													LEFT JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = TOP.DHALTER

													WHERE   PRO.USOPROD = 'R'

														AND PRO.ATIVO = 'S'

														AND (		:CANAL = 0 AND CAB.CODTIPOPER IN (1100,1131,111)

																OR  :CANAL = 1 AND CAB.CODTIPOPER IN  (1199)

															)

														AND CAB.STATUSNOTA = 'L'

														AND CAB.STATUSNFE = 'A'

														AND CAB.CODEMP IN :CODEMP

													GROUP BY PRO.CODPROD

												) SUB ON (SUB.CODPROD = PRO.CODPROD)

									LEFT JOIN TGFPAT PAT ON PRO.CODPAT = PAT.CODPAT

									LEFT JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD

									LEFT JOIN TGFGRU GR2 ON GRU.CODGRUPAI = GR2.CODGRUPOPROD

									WHERE

											PRO.USOPROD = 'R'

											AND PRO.ATIVO = 'S'

											AND GR2.CODGRUPOPROD = NVL(:GRUPOPAI,GR2.CODGRUPOPROD)

											AND PRO.CODMARCA = NVL(:MARCA,PRO.CODMARCA)

											AND PRO.CODPROD = NVL(:CODPROD,PRO.CODPROD)

								)

						ORDER BY (CASE WHEN ULT12_RS <> 0 AND TOTAL <> 0 THEN ULT12_RS/TOTAL ELSE 0 END) DESC

					) SUB

			LEFT JOIN	(	SELECT SUM(ESTOQUE) ESTOQUE, SUM(RESERVADO) RESERVADO, CODPROD

							FROM	TGFEST

							WHERE

									CODLOCAL IN (SELECT CODLOCAL FROM TGFLOC WHERE DESCRLOCAL LIKE CASE WHEN :CANAL = 0 THEN '%PRIVADO%'

																														ELSE '%PUBLICO%' END)

								AND CODEMP IN :CODEMP

							GROUP BY CODPROD

						) EST ON (SUB.CODPROD = EST.CODPROD)

			LEFT JOIN 	(	SELECT    ITE.CODPROD, SUM(ITE.QTDNEG - ITE.QTDENTREGUE) QTDRESERVA

							FROM	TGFITE ITE

							LEFT JOIN    TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA

							WHERE

									CAB.CODTIPOPER IN (CASE WHEN :CANAL = 0 THEN 1006 ELSE 1005 END)

								AND CAB.PENDENTE = 'S'

								AND ITE.PENDENTE = 'S'

								AND ITE.CONTROLE <> ' '

								AND ((:CANAL = 0 AND CAB.STATUSNOTA IN ('L','A')) OR (:CANAL = 1 AND CAB.STATUSNOTA = 'L'))

								AND CAB.CODEMP IN :CODEMP

							GROUP BY ITE.CODPROD

						) RES ON (SUB.CODPROD = RES.CODPROD)

			LEFT JOIN (

            SELECT

                ITE.CODPROD,

                SUM(ITE.QTDNEG - ITE.QTDENTREGUE) AS QTDTRANSITO

            FROM TGFITE ITE

            LEFT JOIN TGFCAB CAB 

                ON CAB.NUNOTA = ITE.NUNOTA

            WHERE

                (

                    (:CANAL = 0 AND CAB.CODTIPOPER IN (100, 111))

                    OR

                    (:CANAL <> 0 AND CAB.CODTIPOPER = 1702)

                )

                AND CAB.STATUSNOTA = 'L'

                AND CAB.PENDENTE = 'S'

                AND ITE.PENDENTE = 'S'

                AND CAB.CODEMP IN :CODEMP

            GROUP BY ITE.CODPROD

        ) PED ON SUB.CODPROD = PED.CODPROD

            /* Última movimentação que efetivamente deu entrada no estoque */
            LEFT JOIN (
                SELECT
                    ITE.CODPROD,
                    MAX(NVL(CAB.DTENTSAI, CAB.DTNEG)) AS DT_ULTIMA_ENTRADA
                FROM TGFITE ITE
                INNER JOIN TGFCAB CAB
                    ON CAB.NUNOTA = ITE.NUNOTA
                WHERE ITE.ATUALESTOQUE = 1
                  AND CAB.STATUSNOTA = 'L'
                  AND CAB.CODEMP IN :CODEMP
                  AND ITE.CODLOCALORIG IN (
                        SELECT LOC.CODLOCAL
                        FROM TGFLOC LOC
                        WHERE LOC.DESCRLOCAL LIKE
                              CASE
                                  WHEN :CANAL = 0 THEN '%PRIVADO%'
                                  ELSE '%PUBLICO%'
                              END
                  )
                GROUP BY ITE.CODPROD
            ) ULTENT ON ULTENT.CODPROD = SUB.CODPROD

            GROUP BY SUB.CODGRUPOPROD

					,SUB.CODPROD

					,SUB.DESCRPROD

					,SUB.MARCA

					,SUB.CODPAT

					,SUB.PERMCOMPPROD

					,SUB.ULT12_RS

					,SUB.ULT12_QTD

					,SUB.ULT03_QTD

					,SUB.ULT01_QTD

					,SUB.ATUAL_QTD

					,SUB.PERC

					,SUB.ACUM

					,SUB.CURVA

					,SUB.MDV_12

					,SUB.MDV_03

					,SUB.MDV_01

					,SUB.MDV

					,SUB.MDV_AJUST

					,SUB.MDV_RECENTE

					,EST.ESTOQUE

					,RES.QTDRESERVA

					,PED.QTDTRANSITO

					,ULTENT.DT_ULTIMA_ENTRADA

					,SUB.TOTAL

					,SUB.LEADTIME

					,SUB.CODGRUPAI

					,SUB.GRUPO_PAI

					,SUB.GRUPO

					,SUB.DESCRICAO

					,SUB.EXCLUIOL

		) GIR

ORDER BY NVL(ULT12_RS, 0) DESC