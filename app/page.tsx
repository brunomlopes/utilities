import Link from "next/link";
import { utilities } from "@/tools/registry";
import styles from "./home.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Browser-only tools</p>
        <h1>Utilities</h1>
        <p className={styles.intro}>
          Focused tools for everyday data tasks. Everything runs locally in your browser.
        </p>
      </header>

      <section className={styles.catalog} aria-labelledby="utilities-heading">
        <div className={styles.catalogHeading}>
          <h2 id="utilities-heading">Available utilities</h2>
          <span>{utilities.length.toString().padStart(2, "0")}</span>
        </div>
        <div className={styles.grid}>
          {utilities.map((utility, index) => (
            <Link className={styles.card} href={utility.href} key={utility.slug}>
              <span className={styles.cardNumber} aria-hidden="true">
                {(index + 1).toString().padStart(2, "0")}
              </span>
              <div>
                <h3>{utility.title}</h3>
                <p>{utility.description}</p>
              </div>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
