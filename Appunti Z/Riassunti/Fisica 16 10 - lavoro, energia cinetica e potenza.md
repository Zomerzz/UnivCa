# Fisica 16/10 – Lavoro, energia cinetica e potenza

## <font color="#4bacc6">Lavoro</font>
il lavoro è uno **scalare**, prodotto di una forza per uno spostamento
$$L = \vec{F} \cdot \vec{d} = Fd\cos\alpha \qquad [N \cdot m] = [J] \ \text{(joule)}$$
- $\alpha = 0$: forza concorde allo spostamento → $L > 0$
- $\alpha = \pi$: forza discorde → $L < 0$
- $\alpha = \frac{\pi}{2}$: forza perpendicolare → $L = 0$
> con forza variabile, il lavoro è l'**area sotto il grafico** F(x): positiva sopra l'asse, negativa sotto
---
## <font color="#4bacc6">Teorema dell'energia cinetica</font>
caso 1D con forza costante: $L = F \cdot d = ma \cdot d$, e da $v^{2} = v_{0}^{2} + 2ad$:
$$v^{2} - v_{0}^{2} = 2\frac{F}{m}d = \frac{2}{m}L \ \Rightarrow \ L = \frac{1}{2}mv^{2} - \frac{1}{2}mv_{0}^{2} = K_{f} - K_{i}$$
$$K = \frac{1}{2}mv^{2} \ \text{(energia cinetica)}$$
> il lavoro della forza totale fa cambiare l'energia cinetica del corpo
---
## <font color="#4bacc6">Lavoro della forza peso</font>
$$\vec{F}_{g} = -mg\hat{y} \qquad L_{g} = \vec{F}_{g} \cdot \vec{d} = -mgd$$
corpo che sale ($d > 0$): $L_{g} < 0$; corpo che scende ($d < 0$): $L_{g} > 0$
---
## <font color="#4bacc6">Forza elastica – legge di Hooke</font>
$$F = -kx$$
vale solo per piccoli spostamenti: oltre il limite di elasticità la molla si deforma in modo permanente
lavoro della molla da 0 a d (area del triangolo sotto il grafico):
$$L = -\frac{1}{2}kd^{2}$$
---
## <font color="#4bacc6">Potenza</font>
$$P = \frac{\Delta L}{\Delta t} \qquad P = \lim_{\Delta t \to 0}\frac{\Delta L}{\Delta t} = \frac{dL}{dt} \quad \left[\frac{J}{s}\right] = \left[\frac{kg \cdot m^{2}}{s^{3}}\right] = [W]$$
$$P = \frac{d(F \cdot d)}{dt} = F\frac{d(d)}{dt} = F \cdot v$$
**kilowattora**: $1 \ kWh = 1000 \ W \cdot 3600 \ s = 3{,}6 \cdot 10^{6} \ J$
> attenzione: nella lavagna c'è $W = J \cdot s$, ma il watt è **joule al secondo**: $W = \frac{J}{s}$. È il kWh che è una potenza per un tempo, quindi un'energia
---
## <font color="#4bacc6">Es. 1 – potenza per accelerare un'auto</font>
$m = 1500 \ kg$, da 0 a 100 km/h ($27{,}8 \ m/s$) in 5 s
$$L = K_{f} - K_{i} = \frac{1}{2} \cdot 1500 \cdot 27{,}8^{2} \approx 578 \ kJ \qquad P = \frac{L}{t} = \frac{578000}{5} \approx 116 \ kW$$
> nella lavagna ci sono vari tentativi ($a = v \cdot t$, $P = m \cdot d^{2} \cdot t^{3}$) che non tornano dimensionalmente; la strada giusta è quella con cui chiudi: $P = \frac{\frac{1}{2}mv^{2}}{t}$
---
## <font color="#4bacc6">Es. 2 – potenza per andare a 200 km/h</font>
a velocità costante il motore deve vincere la resistenza dell'aria
$$P = F \cdot v = \frac{1}{2}C\rho Av^{2} \cdot v = \frac{1}{2}C\rho Av^{3}$$
con $C = 0{,}3$, $\rho = 1{,}2 \ kg/m^{3}$, $A = 3 \ m^{2}$, $v = 55{,}6 \ m/s$:
$$P = \frac{1}{2} \cdot 0{,}3 \cdot 1{,}2 \cdot 3 \cdot 55{,}6^{3} \approx 93 \ kW$$
> nella lavagna è usata $\rho = 0{,}2$ (da cui 14973 W): con la densità giusta dell'aria, 1,2, la potenza è circa 6 volte tanto
---
## <font color="#4bacc6">Es. 3 – il giro della morte con l'energia</font>
da che altezza h deve partire (senza attrito) un corpo per completare un giro di raggio r?
in cima al giro serve $\frac{v^{2}}{r} \ge g$, cioè $v_{top}^{2} = gr$. Con l'energia, tra la partenza (h) e la cima del giro (2r):
$$mg(h - 2r) = \frac{1}{2}mv_{top}^{2} = \frac{1}{2}mgr \ \Rightarrow \ h = \frac{5}{2}r$$
> sulla lavagna l'esercizio è impostato con $v^{2} = 2gh$ e $v = \sqrt{gr}$ ma non è chiuso: il pezzo che manca è che in cima il corpo si trova a quota 2r, non a 0
