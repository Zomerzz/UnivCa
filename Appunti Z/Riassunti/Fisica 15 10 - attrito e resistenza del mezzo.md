# Fisica 15/10 – Attrito e resistenza del mezzo

## <font color="#4bacc6">Attrito statico e dinamico</font>
l'attrito statico è una forza di bilanciamento: è uguale e opposto alla forza applicata e cresce con lei fino al **punto di rottura**; da lì in poi il corpo si muove e subentra l'attrito dinamico (più piccolo, circa costante)
$$f_{s} \le \mu_{s}F_{N} \qquad f_{s,max} = \mu_{s}F_{N} = \mu_{s}mg \ \text{(piano orizzontale)} \qquad f_{d} = \mu_{d}F_{N}$$
> sul grafico: l'attrito sale insieme alla forza, ha un picco al punto di rottura e poi scende al valore dinamico
---
## <font color="#4bacc6">Misurare μs con il piano inclinato</font>
si alza l'angolo $\theta$ finché il blocco non comincia a scivolare
$$F_{N} = mg\cos\theta \qquad \text{lungo il piano:} \ mg\sin\theta - \mu_{s}mg\cos\theta = 0$$
$$\mu_{s} = \tan\theta_{max}$$
> la massa si semplifica: il coefficiente dipende solo dall'angolo a cui il blocco parte
---
## <font color="#4bacc6">Es. 1 – tracce di frenata</font>
dalla lunghezza d delle tracce si risale alla velocità iniziale
$$f_{d} = \mu_{d}mg \qquad a = -\frac{f_{d}}{m} = -\mu_{d}g$$
$$0 = v_{0}^{2} + 2ad \ \Rightarrow \ v_{0} = \sqrt{-2ad} = \sqrt{2\mu_{d}gd}$$
con $d = 20 \ m$ e $\mu_{d} = 0{,}8$:
$$v_{0} = \sqrt{2 \cdot 0{,}8 \cdot 9{,}81 \cdot 20} \approx 17{,}7 \ m/s \approx 64 \ km/h$$
---
## <font color="#4bacc6">Es. 2 – auto in curva</font>
qual è la velocità massima in una curva di raggio r prima di uscire di strada? La forza centripeta la dà l'attrito statico
$$f_{s} = ma_{c} = m\frac{v^{2}}{r} \qquad f_{s,max} = \mu_{s}mg$$
$$\mu_{s}mg = m\frac{v^{2}}{r} \ \Rightarrow \ v_{max} = \sqrt{\mu_{s}gr}$$
con $r = 100 \ m$, $\mu_{s} = 1$: $v = \sqrt{981} \approx 30 \ m/s$
---
## <font color="#4bacc6">Resistenza del mezzo</font>
$$F_{res} = -(k_{1}v + k_{2}v^{2})$$
- $k_{1}v$: resistenza **viscosa**, domina a **bassa velocità**
- $k_{2}v^{2}$: resistenza **di forma / di pressione**, domina ad **alta velocità**
$$F_{res} = -\frac{1}{2}C\rho Av^{2}$$
C = coefficiente aerodinamico, $\rho$ = densità $[kg/m^{3}]$, A = area della superficie frontale
densità: aria $\approx 1{,}2 \ kg/m^{3}$, acqua $1000 \ kg/m^{3}$
> attenzione: nella lavagna c'è "aria 1 m³ = 0,2 kg", il valore giusto è circa **1,2 kg** (quello che usi poi nell'esercizio)
---
## <font color="#4bacc6">Es. 3 – forza del motore a velocità costante</font>
un'auto viaggia a 110 km/h ($\approx 30 \ m/s$) costanti: velocità costante → forza totale nulla
$$F_{motore} + F_{res} = 0 \ \Rightarrow \ F = \frac{1}{2}C\rho Av^{2} = \frac{1}{2} \cdot 0{,}3 \cdot 1{,}2 \cdot 3 \cdot 30^{2} = 486 \ N$$
