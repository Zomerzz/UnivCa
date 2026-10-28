# Fisica 20/10 – Forze conservative, energia potenziale, conservazione dell'energia

## <font color="#4bacc6">Ripasso</font>
$$L = \vec{F} \cdot \vec{d} \qquad K = \frac{1}{2}mv^{2} \qquad L = K_{f} - K_{i} \qquad P = \frac{dL}{dt} = F \cdot v$$
---
## <font color="#4bacc6">Forze conservative</font>
una forza è **conservativa** se il lavoro da A a B è lo stesso su qualsiasi percorso (dipende solo da partenza e arrivo)
- il lavoro su un percorso chiuso è 0
- $L_{AB} = -L_{BA}$

esempi: **forza di gravità** ($F = mg$), **forza elastica** ($F_{el} = -k_{el}x$). L'attrito NON è conservativo
---
## <font color="#4bacc6">Energia potenziale</font>
esiste solo per le forze conservative: l'energia che la forza "dà" al corpo resta immagazzinata come energia potenziale finché la forza non la restituisce
$$\Delta U = -L$$
**gravitazionale** ($F_g = -mg$)
$$\Delta U = -L = -F_{g}(y_{f} - y_{i}) = mg(y_{f} - y_{i}) \qquad U = mgh$$
**elastica**
$$U_{el} = \frac{1}{2}k_{el}x^{2} \qquad \Delta U_{el} = \frac{1}{2}k_{el}x_{f}^{2} - \frac{1}{2}k_{el}x_{i}^{2}$$
---
## <font color="#4bacc6">Conservazione dell'energia meccanica</font>
$$L = \Delta K = K_{f} - K_{i} \qquad L = -\Delta U = U_{i} - U_{f}$$
$$\Delta K = -\Delta U \ \Rightarrow \ \Delta K + \Delta U = 0 \ \Rightarrow \ K_{f} + U_{f} = K_{i} + U_{i} = \text{cost}$$
> con solo forze conservative, l'energia passa da cinetica a potenziale e viceversa, ma la somma non cambia
---
## <font color="#4bacc6">Es. 1 – pallina dal piano inclinato</font>
parte ferma da altezza H: $E_{i} = 0 + mgH$, $E_{f} = \frac{1}{2}mv^{2} + 0$
$$mgH = \frac{1}{2}mv^{2} \ \Rightarrow \ v = \sqrt{2gH}$$
---
## <font color="#4bacc6">Es. 2 – il giro della morte</font>
in cima al giro serve $a_{c} = \frac{v^{2}}{r} \ge g \Rightarrow v^{2} = gr$. Conservazione tra la partenza (h) e la cima (2r):
$$mgh = \frac{1}{2}mv^{2} + mg \cdot 2r \ \Rightarrow \ \frac{v^{2}}{2} = g(h - 2r) \ \Rightarrow \ h = \frac{r}{2} + 2r = \frac{5}{2}r$$
---
## <font color="#4bacc6">Es. 3 – Tarzan e la liana</font>
$L = 18 \ m$, tensione massima della liana $T_{max}$, $m = 80 \ kg$. Da che altezza può partire senza che la liana si rompa?
nel punto più basso: $T - mg = ma_{c} = m\frac{v^{2}}{L}$, con $v^{2} = 2gh$:
$$T = m\left(g + \frac{2gh}{L}\right) \ \Rightarrow \ h = \left(\frac{T_{max}}{m} - g\right)\frac{L}{2g}$$
> con $T_{max} = 950 \ N$: $h = (11{,}9 - 9{,}81) \cdot \frac{18}{19{,}62} \approx 1{,}9 \ m$ (nella lavagna c'è "95 N", ma deve essere più del peso di Tarzan, 785 N, quindi ho assunto 950 N)
> attenzione: nella lavagna c'è $T = -mg = ma_c$, è $T - mg = ma_{c}$ (la tensione tira in su, il peso in giù)
---
## <font color="#4bacc6">Es. 4 – molla che lancia una biglia</font>
**in orizzontale**: $\frac{1}{2}k_{el}d^{2} = \frac{1}{2}mv^{2} \Rightarrow v = \sqrt{\frac{k_{el}}{m}}\,d$
**in verticale**, per stati:
1. molla compressa, biglia ferma: $K_1 = 0$, $U_g = 0$, $U_{el} = \frac{1}{2}k_{el}d^{2}$
2. molla rilasciata, biglia in moto: $K_2 = \frac{1}{2}mv^{2}$, $U_{el} = 0$
3. biglia ferma all'apice: $K_3 = 0$, $U_g = mgH$
4. a terra: $K_4 = K_2$

$$mgH = \frac{1}{2}k_{el}d^{2} \ \Rightarrow \ H = \frac{k_{el}d^{2}}{2mg}$$
---
## <font color="#4bacc6">Es. 5 – biglia sparata giù dal tavolo</font>
$m = 10 \ g$, $k_{el} = 1 \ N/cm = 100 \ N/m$, tavolo alto $h = 70 \ cm$. A che distanza cade?
**1) sparo**: $v = \sqrt{\frac{k}{m}}\,d$ — **2) moto del proiettile** (lancio orizzontale):
$$t = \sqrt{\frac{2h}{g}} \qquad R = v \cdot t = d\sqrt{\frac{k}{m}}\sqrt{\frac{2h}{g}} = d \cdot 100 \cdot 0{,}378 \approx 37{,}8 \cdot d$$
> la compressione d non è indicata sulla lavagna: ad esempio con $d = 1 \ cm$ la biglia cade a circa 38 cm dal tavolo
