# Fisica 02/10 – Moto uniformemente accelerato e caduta dei gravi

## <font color="#4bacc6">Le tre equazioni (a = costante)</font>
$$x(t) = x_{0} + v_{0}t + \frac{1}{2}at^{2} \qquad v(t) = v_{0} + at \qquad v^{2} = v_{0}^{2} + 2a(x - x_{0})$$
**dimostrazione della terza**: dalla seconda $t = \frac{v - v_{0}}{a}$, si sostituisce nella prima
$$x = x_{0} + v_{0}\frac{v - v_{0}}{a} + \frac{1}{2}a\left(\frac{v - v_{0}}{a}\right)^{2} = x_{0} + \frac{2v_{0}v - 2v_{0}^{2} + v^{2} - 2vv_{0} + v_{0}^{2}}{2a} = x_{0} + \frac{v^{2} - v_{0}^{2}}{2a}$$
> la terza serve quando nel problema **non c'è il tempo**
---
## <font color="#4bacc6">Es. 1 – pista di decollo</font>
un Boeing 747 parte da fermo con $a = 2{,}2 \ m/s^{2}$, deve arrivare a $v = 95 \ m/s$. Quanto è lunga la pista?
$$v^{2} = 0 + 2a x \ \Rightarrow \ x = \frac{v^{2}}{2a} = \frac{(95)^{2}}{2 \cdot 2{,}2} \approx 2050 \ m$$
> attenzione: in un passaggio c'è $V = 2ax$, manca il quadrato sulla velocità ($v^{2} = 2ax$), il calcolo finale però è giusto
---
## <font color="#4bacc6">Es. 2 – spazio di frenata</font>
$v_{0} = 100 \ km/h = 27{,}8 \ m/s$, $a = -6 \ m/s^{2}$, quanto spazio per fermarsi?
$$0 = v_{0}^{2} + 2ax \ \Rightarrow \ x = -\frac{v_{0}^{2}}{2a} = -\frac{(27{,}8)^{2}}{2 \cdot (-6)} \approx 65 \ m$$
---
## <font color="#4bacc6">Caduta dei gravi</font>
moto uniformemente accelerato con $a = -g = -9{,}81 \ m/s^{2}$ (asse y verso l'alto)
$$y(t) = y_{0} + v_{0}t - \frac{1}{2}gt^{2} \qquad v(t) = v_{0} - gt \qquad v^{2} = v_{0}^{2} - 2g(y - y_{0})$$
**corpo lasciato cadere da altezza h** ($v_{0} = 0$, $y_{0} = h$):
$$y(t) = h - \frac{1}{2}gt^{2} \qquad t_{caduta} = \sqrt{\frac{2h}{g}} \qquad v_{impatto} = \sqrt{2gh}$$
> esempio con $h = 80 \ m$ e $g \approx 10$: $t = \sqrt{\frac{160}{10}} = 4 \ s$
---
## <font color="#4bacc6">Es. 3 – due sassi dal ponte</font>
ponte alto 43,9 m: il primo sasso cade da fermo, il secondo parte 1 s dopo verso il basso con $v_0$; arrivano insieme. Quanto vale $v_0$?
$$t_{1} = \sqrt{\frac{2 \cdot 43{,}9}{9{,}81}} \approx 3 \ s \quad \Rightarrow \quad \text{il secondo cade in } 2 \ s$$
$$43{,}9 = v_{0} \cdot 2 + \frac{1}{2} \cdot 9{,}81 \cdot 2^{2} \ \Rightarrow \ v_{0} = \frac{43{,}9 - 19{,}62}{2} \approx 12{,}1 \ m/s$$
> sulla lavagna è rimasto solo il disegno, questa è la soluzione completa
---
## <font color="#4bacc6">Esercizio in blu</font>
$$\left(\tfrac{1}{3}v_{a}\right)^{2} = v_{a}^{2} - 2g \cdot 0{,}4 \ \Rightarrow \ \frac{8}{9}v_{a}^{2} = 19{,}62 \cdot 0{,}4 = 7{,}85 \ \Rightarrow \ v_{a} = \sqrt{\frac{9 \cdot 7{,}85}{8}} \approx 2{,}97 \ m/s$$
> nella lavagna il segno si perde a metà ($\frac{8}{9}v_a^2 + 7{,}8$) e esce 8,7: se il corpo sale di 0,4 m e la velocità scende a un terzo, la soluzione è circa **3 m/s**
