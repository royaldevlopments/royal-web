import { Link } from 'react-router-dom';
import ScrollReveal from '@/components/ScrollReveal';
import minecraftImg from '@/assets/games/minecraft.jpg';
import hytaleImg from '@/assets/games/hytale.jpg';
import palworldImg from '@/assets/games/palworld.jpg';
import enshroudedImg from '@/assets/games/enshrouded.jpg';
import projectZomboidImg from '@/assets/games/project-zomboid.jpg';
import terrariaImg from '@/assets/games/terraria.jpg';
import valheimImg from '@/assets/games/valheim.jpg';
import arkSurvivalImg from '@/assets/games/ark-survival.jpg';
import arma3Img from '@/assets/games/arma3.jpg';

const games = [
  { name: 'MINECRAFT', image: minecraftImg, link: '/games/minecraft' },
  { name: 'HYTALE', image: hytaleImg, link: '/games/hytale' },
  { name: 'PALWORLD', image: palworldImg, link: '/games/palworld' },
  { name: 'ENSHROUDED', image: enshroudedImg, link: '/games/enshrouded' },
  { name: 'PROJECT ZOMBOID', image: projectZomboidImg, link: '/games/project-zomboid' },
  { name: 'TERRARIA', image: terrariaImg, link: '/games/terraria' },
  { name: 'VALHEIM', image: valheimImg, link: '/games/valheim' },
  { name: 'ARK: SURVIVAL', image: arkSurvivalImg, link: '/games/ark-survival' },
  { name: 'ARMA 3', image: arma3Img, link: '/games/arma-3' },
];

const GameServers = () => {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <ScrollReveal animation="fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 gradient-text-purple">
            GAME SERVER
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {games.map((game, index) => (
            <ScrollReveal key={game.name} animation="scale-in" delay={index * 60}>
              <Link 
                to={game.link}
                className="game-card block"
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <img 
                    src={game.image} 
                    alt={game.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                  />
                </div>
                <div className="p-3 text-center border-t border-border">
                  <span className="text-xs font-semibold text-foreground">{game.name}</span>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal animation="fade-up" delay={200}>
          <div className="text-center mt-10">
            <Link to="/games" className="inline-block btn-primary-gradient px-6 py-2.5 rounded-lg font-medium text-foreground text-sm">
              SEE ALL GAMES
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default GameServers;
