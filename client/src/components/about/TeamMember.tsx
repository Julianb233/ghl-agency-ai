import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Linkedin, Twitter, Github, Mail } from 'lucide-react';

interface SocialLink {
  type: 'linkedin' | 'twitter' | 'github' | 'email';
  url: string;
}

interface TeamMemberProps {
  name: string;
  role: string;
  bio: string;
  image: string;
  socials: SocialLink[];
  gradient?: string;
  delay?: number;
}

const socialIcons = {
  linkedin: Linkedin,
  twitter: Twitter,
  github: Github,
  email: Mail,
};

export const TeamMember: React.FC<TeamMemberProps> = ({
  name,
  role,
  bio,
  image,
  socials,
  gradient = 'from-blue-500 to-purple-500',
  delay = 0,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateX = (-mouseY / rect.height) * 10;
    const rotateY = (mouseX / rect.width) * 10;

    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      className="relative"
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-sm"
        animate={{
          rotateX: rotation.x,
          rotateY: rotation.y,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      >
        {/* Gradient border on hover */}
        <motion.div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${gradient} opacity-0`}
          animate={{ opacity: isHovered ? 0.3 : 0 }}
          style={{
            padding: '1px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />

        <div className="p-6">
          {/* Avatar */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${gradient} animate-pulse opacity-50`} />
            <div className="absolute inset-1 rounded-full bg-slate-900 overflow-hidden">
              {image ? (
                <img
                  src={image}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl font-bold text-white`}>
                  {name.split(' ').map(n => n[0]).join('')}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-white mb-1">{name}</h3>
            <p className={`text-sm font-medium bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
              {role}
            </p>
          </div>

          {/* Bio */}
          <p className="text-sm text-slate-400 text-center mb-6">{bio}</p>

          {/* Social Links */}
          <div className="flex justify-center gap-3">
            {socials.map((social) => {
              const Icon = socialIcons[social.type];
              return (
                <motion.a
                  key={social.type}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon className="w-4 h-4" />
                </motion.a>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TeamMember;
