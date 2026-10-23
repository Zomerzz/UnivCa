# Fisica 23/10 – Conservazione della quantità di moto, impulso, urti, sistemi a massa variabile

## <font color="#4bacc6">Conservazione della quantità di moto</font>
$$\frac{d\vec{p}}{dt} = \vec{F}_{net} \qquad \text{se} \ \vec{F}_{net} = 0 \ \Rightarrow \ \vec{p} = \text{cost}$$
---
## <font color="#4bacc6">Teorema dell'impulso (1D)</font>
$$dp = F\,dt \qquad \Delta p = \int_{p_{i}}^{p_{f}} dp = \int_{t_{i}}^{t_{f}} F(t)\,dt = J \ \text{(impulso)}$$
> l'impulso è l'area sotto il grafico F(t): una forza grande per poco tempo può dare lo stesso impulso di una piccola per tanto tempo
---
## <font color="#4bacc6">Es. 1 – proiettili contro Superman</font>
100 proiettili al minuto, 3 g ciascuno, a 500 km/h ($138{,}9 \ m/s$), rimbalzano indietro con la stessa velocità. Forza media?
ogni proiettile inverte la velocità: $\Delta p = m v - (-mv) = 2mv$
$$\Delta p_{1} = 2 \cdot 0{,}003 \cdot 138{,}9 \approx 0{,}83 \ kg \cdot \frac{m}{s} \qquad F_{media} = \frac{N \cdot \Delta p_{1}}{\Delta t} = \frac{100 \cdot 0{,}83}{60 \ s} \approx 1{,}4 \ N$$
> sulla lavagna c'è solo il testo: questa è la soluzione. Rimbalzando, il proiettile dà il doppio dell'impulso rispetto a fermarsi
---
## <font color="#4bacc6">Es. 2 – pendolo balistico</font>
un proiettile m a velocità $v_0$ si conficca in un blocco M appeso, che sale di h
**1) urto anelastico** (si conserva p, non l'energia):
$$p_{i} = mv_{0} \qquad p_{f} = (m + M)v_{f} \ \Rightarrow \ v_{f} = \frac{m}{m + M}v_{0}$$
**2) salita** (si conserva l'energia):
$$\frac{1}{2}(m + M)v_{f}^{2} = (m + M)gh \ \Rightarrow \ h = \frac{v_{f}^{2}}{2g} = \left(\frac{m}{m + M}\right)^{2}\frac{v_{0}^{2}}{2g}$$
> attenzione: nella lavagna l'energia cinetica è scritta $K = (m+M)v_f^2$, manca $\frac{1}{2}$. Il risultato finale $h = \frac{v_f^2}{2g}$ è comunque giusto
---
## <font color="#4bacc6">Sistemi a massa variabile – il razzo</font>
il razzo di massa M e velocità v espelle una massa $dM$ di gas; la quantità di moto totale si conserva
U = velocità del gas rispetto a terra, u = velocità del gas rispetto al razzo:
$$U = (v + dv) - u$$
$$Mv = dM\left[(v + dv) - u\right] + (M - dM)(v + dv)$$
semplificando (si trascura il prodotto $dM\,dv$):
$$0 = -dM\,u + M\,dv \ \Rightarrow \ M\,dv = u\,dM \ \Rightarrow \ dv = \frac{dM}{M}u$$
dividendo per dt:
$$M\frac{dv}{dt} = \frac{dM}{dt}u \ \Rightarrow \ Ma = Ru$$
$R = \frac{dM}{dt} \ [kg/s]$ = massa di gas espulsa nel tempo, $Ru$ = **spinta**
---
## <font color="#4bacc6">Equazione del razzo</font>
$$v_{f} = \int_{0}^{v_{f}} dv = u\int_{M_{f}}^{M_{i}} \frac{dM}{M} = u\ln\frac{M_{i}}{M_{f}}$$
> la velocità finale dipende solo dalla velocità dei gas e dal rapporto tra massa iniziale e finale
**per sollevarsi dal suolo** (es. Tesla Roadster): la spinta deve vincere il peso
$$Ru \ge Mg$$
