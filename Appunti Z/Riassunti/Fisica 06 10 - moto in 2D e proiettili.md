# Fisica 06/10 – Moto in 2 e 3 dimensioni, moto dei proiettili

## <font color="#4bacc6">Moto in più dimensioni</font>
il moto in 2 o 3 dimensioni si scompone in più moti unidimensionali indipendenti, sommati tra loro. La posizione è un **vettore** $\vec{r}$
$$\vec{v}_{m} = \frac{\Delta\vec{r}}{\Delta t} = \frac{\Delta r_{x}}{\Delta t}\hat{i} + \frac{\Delta r_{y}}{\Delta t}\hat{j} \qquad \vec{v} = \lim_{\Delta t \to 0}\frac{\Delta\vec{r}}{\Delta t} = \frac{d\vec{r}}{dt} = v_{x}\hat{i} + v_{y}\hat{j}$$
$$v_{x} = \frac{dr_{x}}{dt} \qquad v_{y} = \frac{dr_{y}}{dt}$$
$$\vec{a}_{m} = \frac{\Delta\vec{v}}{\Delta t} = \frac{\Delta v_{x}}{\Delta t}\hat{i} + \frac{\Delta v_{y}}{\Delta t}\hat{j} \qquad \vec{a} = \frac{d\vec{v}}{dt} = a_{x}\hat{i} + a_{y}\hat{j}$$
> la velocità è sempre tangente alla traiettoria; l'accelerazione si può dividere in una componente tangenziale e una perpendicolare alla traiettoria
---
## <font color="#4bacc6">Moto dei proiettili</font>
con $x_{0} = y_{0} = 0$, $a_{x} = 0$, $a_{y} = -g$ e $v_0$ con angolo $\alpha$:
$$v_{0x} = v_{0}\cos\alpha \qquad v_{0y} = v_{0}\sin\alpha$$
$$x(t) = v_{0x}t \ \text{(moto uniforme)} \qquad y(t) = v_{0y}t - \frac{1}{2}gt^{2} \ \text{(uniformemente accelerato)}$$
> in orizzontale nessuna accelerazione, in verticale c'è solo g: la traiettoria è una parabola
---
## <font color="#4bacc6">Tempo di volo, altezza massima, gittata</font>
$$y(t) = v_{0y}t - \frac{1}{2}gt^{2} = 0 \ \Rightarrow \ t = 0 \ \text{oppure} \ t_{v} = \frac{2v_{0y}}{g}$$
il tempo per l'altezza massima è metà del volo:
$$t_{h} = \frac{v_{0y}}{g}$$
**gittata**
$$R = x(t_{v}) = v_{0x} \cdot t_{v} = \frac{2v_{0x}v_{0y}}{g} = \frac{2v_{0}^{2}\sin\alpha\cos\alpha}{g} = \frac{v_{0}^{2}\sin 2\alpha}{g}$$
> $2\sin\alpha\cos\alpha = \sin 2\alpha$: la gittata è massima a $\alpha = 45°$, dove $\sin 2\alpha = 1$
---
## <font color="#4bacc6">Es. 1 – salto in lungo</font>
che velocità serve allo stacco per saltare 9 m? Con $\alpha = 45°$:
$$R = \frac{v_{0}^{2}}{g} \ \Rightarrow \ v_{0} = \sqrt{Rg} = \sqrt{9 \cdot 9{,}81} \approx 9{,}4 \ m/s$$
---
## <font color="#4bacc6">Es. 2 – pacco dall'aereo</font>
un aereo scende a 45° e lascia cadere un pacco a 250 m di altezza; il pacco atterra dopo 5 s. Quanto vale $v_0$?
$$y(t) = h - v_{0}\sin\alpha \cdot t - \frac{1}{2}gt^{2} = 0$$
$$v_{0} = \frac{h - \frac{1}{2}gt^{2}}{t\sin\alpha} = \frac{250 - \frac{1}{2} \cdot 9{,}81 \cdot 25}{5 \cdot \sin 45°} = \frac{127{,}4}{3{,}54} \approx 36 \ m/s$$
> attenzione: nella lavagna l'ultimo passaggio è $v_{0}\sin\alpha = -\frac{1}{2}gt^{2} - h$: i segni sono invertiti e manca la divisione per t. Si porta $v_0$ da solo da un lato, come qui sopra
